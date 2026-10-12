import type { useLogger } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { RedirectRule } from '../runtime/shared/redirects'
import type { Redirects } from './redirects'
import { addServerHandler, extendRouteRules, hasNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'
import { resolveI18nConfig } from 'nuxtseo-shared/i18n'
import { expandLocalePrefixes, formatRedirectReport, planRedirects, resolveLocalePrefixes, toRedirectRules } from './redirects'

export interface SetupRedirectsContext {
  nuxt: Nuxt
  logger: ReturnType<typeof useLogger>
  /** The resolved path of the redirect server middleware. */
  middleware: string
  now: Date
  hasI18n: boolean
}

function sourceKey(rule: RedirectRule): string {
  return rule.pattern._tag === 'Exact' ? rule.pattern.path : `${rule.pattern.prefix}/**`
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
  nuxt.hook('modules:done', async () => {
    const i18n = ctx.hasI18n ? await resolveI18nConfig(logger) : false
    // Locale domains need a host-aware match, which a path prefix cannot express
    if (i18n && !i18n.differentDomains && !i18n.multiDomainLocales)
      rules = expandLocalePrefixes(rules, resolveLocalePrefixes(i18n))
    nuxt.options.runtimeConfig['seo-utils-redirects'] = rules
    // Keep old URLs out of the sitemap. Nuxt Sitemap reads this route rule.
    if (hasNuxtModule('@nuxtjs/sitemap', nuxt)) {
      for (const rule of rules)
        extendRouteRules(sourceKey(rule), { sitemap: false } as Record<string, unknown>)
    }
  })

  nuxt.hook('nitro:init', (nitro) => {
    if (!nitro.options.static) {
      // A crawled link would prerender the redirect as a 200 HTML file, which the server serves before this middleware
      for (const rule of rules)
        nitro.options.routeRules[sourceKey(rule)] = defu(nitro.options.routeRules[sourceKey(rule)], { prerender: false })
      return
    }
    // A static host has no server. Prerender each exact moved URL as an instant meta refresh page.
    const pages = rules.filter(rule => rule._tag === 'Moved' && rule.pattern._tag === 'Exact')
    const unserved = rules.filter(rule => !pages.includes(rule)).map(sourceKey)
    nitro.hooks.hook('prerender:routes', (routes) => {
      for (const rule of pages)
        routes.add(sourceKey(rule))
    })
    if (unserved.length) {
      logger.warn([
        'A static build cannot send a redirect or 410 status. Each exact moved URL gets an HTML page with an instant meta refresh.',
        'These entries need host redirect rules, or they return the host 404 page:',
        ...unserved.map(source => `  - ${source}`),
      ].join('\n'))
    }
  })
}
