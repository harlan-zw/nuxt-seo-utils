import type { useLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { RedirectRule } from '../runtime/shared/redirects'
import type { Redirects } from './redirects'
import { existsSync } from 'node:fs'
import { addServerHandler, extendRouteRules, hasNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'
import { resolveI18nConfig } from 'nuxtseo-shared/i18n'
import { join } from 'pathe'
import { joinURL, withoutTrailingSlash } from 'ufo'
import { expandLocalePrefixes, formatRedirectReport, planRedirects, resolveLocalePrefixes, toRedirectRules } from './redirects'
import { formatMetaRefreshFallback, formatUnservedGone, nativeSourceKeys, planNativeRedirects, resolveStaticHost } from './staticRedirects'

export interface SetupRedirectsContext {
  nuxt: Nuxt
  logger: ReturnType<typeof useLogger>
  /** The resolved path of the redirect server middleware. */
  middleware: string
  sitemapPlugin: string
  now: Date
  hasI18n: boolean
}

type RouteRules = NonNullable<Nuxt['options']['nitro']['routeRules']>
interface SitemapRule { sitemap?: false | object }

function sourceKey(rule: RedirectRule): string {
  return rule.pattern._tag === 'Exact' ? rule.pattern.path : `${rule.pattern.prefix}/**`
}

function separateGeneratedRules(current: RouteRules, prerenderKeys: Set<string>, sitemapKeys: Set<string>) {
  const runtimeRules = { ...current }
  const sitemapDefaults: Record<string, { sitemap: false }> = {}
  for (const key of new Set([...prerenderKeys, ...sitemapKeys])) {
    const currentRule = runtimeRules[key]
    if (!currentRule)
      continue
    const rule: typeof currentRule & SitemapRule = { ...currentRule }
    if (prerenderKeys.has(key) && rule.prerender === false)
      delete rule.prerender
    if (sitemapKeys.has(key) && rule.sitemap === false) {
      sitemapDefaults[key] = { sitemap: false }
      delete rule.sitemap
    }
    if (Object.keys(rule).length)
      runtimeRules[key] = rule
    else
      delete runtimeRules[key]
  }
  return { runtimeRules, sitemapDefaults }
}

export function setupRedirects(redirects: Redirects | undefined, reviewAfterDays: number | false, ctx: SetupRedirectsContext): void {
  const { nuxt, logger } = ctx
  if (!redirects || !Object.keys(redirects).length || nuxt.options._prepare)
    return

  const plan = planRedirects(redirects, { now: ctx.now, reviewAfterDays })
  const report = formatRedirectReport(plan.issues, reviewAfterDays)
  // An invalid entry cannot be served, so stop before a deploy drops the redirect
  if (report.error)
    throw new Error(`[nuxt-seo-utils] ${report.error}`)
  if (report.warn)
    logger.warn(report.warn)
  if (report.info)
    logger.info(report.info)
  if (!plan.entries.length)
    return

  addServerHandler({ middleware: true, handler: ctx.middleware })

  let rules: RedirectRule[] = toRedirectRules(plan.entries)
  let hasSitemap = false
  let sitemapDefaults: Record<string, { sitemap: false }> = {}
  const generatedSitemapKeys = new Set<string>()
  nuxt.hook('modules:done', async () => {
    const i18n = ctx.hasI18n ? await resolveI18nConfig(logger) : false
    // Locale domains need a host-aware match, which a path prefix cannot express
    if (i18n && !i18n.differentDomains && !i18n.multiDomainLocales)
      rules = expandLocalePrefixes(rules, resolveLocalePrefixes(i18n))
    // A startup environment value can still replace the bundled redirects.
    nuxt.options.runtimeConfig['seo-utils-redirects'] = false
    hasSitemap = hasNuxtModule('@nuxtjs/sitemap', nuxt)
    if (!hasSitemap)
      return
    for (const rule of rules) {
      const key = sourceKey(rule)
      const nuxtRule = nuxt.options.routeRules?.[key] as SitemapRule | undefined
      const nitroRule = nuxt.options.nitro.routeRules?.[key] as SitemapRule | undefined
      if (nuxtRule?.sitemap == null && nitroRule?.sitemap == null)
        generatedSitemapKeys.add(key)
      // Sitemap also reads these rules when building its prerendered sources.
      extendRouteRules(key, { sitemap: false } as Record<string, unknown>)
    }
  })

  nuxt.hook('nitro:config', (nitroConfig) => {
    const virtual = nitroConfig.virtual ||= {}
    virtual['#seo-utils-virtual/redirects.mjs'] = () => `export default ${JSON.stringify(rules)}`
    if (!hasSitemap)
      return
    const sitemapConfig = '#sitemap-virtual/static-config.mjs'
    virtual['#seo-utils-virtual/redirect-sitemap-rules.mjs'] = () => [
      sitemapConfig in virtual ? `export { default as sitemapConfig } from '${sitemapConfig}'` : 'export const sitemapConfig = {}',
      `export const redirectRules = ${JSON.stringify(sitemapDefaults)}`,
    ].join('\n')
    // Apply the generated defaults before application sitemap hooks run.
    nitroConfig.plugins = [ctx.sitemapPlugin, ...(nitroConfig.plugins || [])]
  })

  nuxt.hook('nitro:init', (nitro) => {
    const { baseURL, routeRules } = nitro.options
    const generatedPrerenderKeys = new Set<string>()
    const setPrerender = (keys: string[], prerender: boolean) => {
      for (const key of keys) {
        if (!prerender && routeRules[key]?.prerender == null)
          generatedPrerenderKeys.add(key)
        routeRules[key] = defu(routeRules[key], { prerender })
      }
    }
    // The server matches route rules without `app.baseURL`, but the prerender crawler matches links with it
    const blockPrerender = (keys: string[]) => setPrerender(
      (withoutTrailingSlash(baseURL) || '/') === '/' ? keys : keys.flatMap(key => [key, joinURL(baseURL, key)]),
      false,
    )
    if (!nitro.options.static) {
      // A crawled link would prerender the redirect as a 200 HTML file, which the server serves before this middleware
      blockPrerender(rules.map(sourceKey))
      if (!nitro.options.dev) {
        // Nitro's production bundle starts after prerendering and the bundler
        // config hooks, but before the runtime config module is loaded.
        nitro.options.rollupConfig = {
          output: {},
          ...nitro.options.rollupConfig,
          plugins: [nitro.options.rollupConfig?.plugins, {
            name: 'nuxt-seo-utils:redirect-route-rules',
            buildStart() {
              const config = nitro.options.runtimeConfig.nitro
              if (!config.routeRules)
                return
              const separated = separateGeneratedRules(config.routeRules, generatedPrerenderKeys, generatedSitemapKeys)
              config.routeRules = separated.runtimeRules
              sitemapDefaults = separated.sitemapDefaults
            },
          }],
        }
      }
      return
    }

    const host = resolveStaticHost(nitro.options.preset, baseURL)
    if (host._tag === 'MetaRefresh') {
      // The host has no redirect file. Prerender each exact moved URL as an instant meta refresh page.
      const pages = rules.filter(rule => rule._tag === 'Moved' && rule.pattern._tag === 'Exact')
      const unserved = rules.filter(rule => !pages.includes(rule)).map(sourceKey)
      // A crawled link to a gone URL fails the prerender with its 410 or 404 status
      blockPrerender(rules.filter(rule => rule._tag === 'Gone').map(sourceKey))
      // An exact key wins over a `/**` key, so a moved page inside a gone prefix still renders
      setPrerender(pages.map(sourceKey), true)
      if (unserved.length)
        logger.warn(formatMetaRefreshFallback(host.reason, unserved))
      return
    }

    // A prerendered page at a source path would shadow the host rule
    blockPrerender(nativeSourceKeys(rules))
    // Earlier route rules reach the client router and the prerenderer. In Nitro 2 and 3, this hook runs after both, before the preset writes its files.
    nitro.hooks.hook('prerender:done', () => {
      const plan = planNativeRedirects(rules, host, {
        baseURL,
        errorPage: existsSync(join(nitro.options.output.publicDir, '404.html')),
      })
      if (plan.output._tag === 'VercelRoutes') {
        const config = (nitro.options.vercel ||= { config: { version: 3 } }).config ||= { version: 3 }
        // The Nitro 2 route type omits `status` and `Location`, which the Build Output API accepts on any route
        config.routes = [...(config.routes || []), ...plan.output.routes as NonNullable<typeof config.routes>]
      }
      else {
        for (const [key, redirect] of plan.output.redirects) {
          const existing = nitro.options.routeRules[key]
          // Insert the key again, so the writer reads the keys in plan order
          delete nitro.options.routeRules[key]
          nitro.options.routeRules[key] = defu(existing, { redirect } as typeof existing)
        }
      }
      if (plan.unserved)
        logger.warn(formatUnservedGone(host, plan.unserved))
    })
  })
}
