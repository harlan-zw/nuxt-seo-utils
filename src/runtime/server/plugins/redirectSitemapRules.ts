import type { ModuleRuntimeConfig, SitemapRenderCtx } from '@nuxtjs/sitemap'
import { defu } from 'defu'
import { useRuntimeConfig } from 'nuxt/server'
import { createNitroRouteRuleMatcher } from 'nuxtseo-shared/server'
import { defineNitroPlugin } from '#nuxtseo/nitro'
// @ts-expect-error Nitro supplies the generated sitemap rules when Sitemap is installed.
import { redirectRules, sitemapConfig } from '#seo-utils-virtual/redirect-sitemap-rules.mjs'

type SitemapConfig = Pick<ModuleRuntimeConfig, 'autoI18n'>
interface SitemapHooks {
  hook: (name: 'sitemap:resolved', callback: (ctx: SitemapRenderCtx) => void) => void
}

export default defineNitroPlugin((nitro) => {
  if (!Object.keys(redirectRules).length)
    return

  const config = useRuntimeConfig()
  // Sitemap 9 bundles locale settings. Older versions keep them in runtime config.
  const { autoI18n } = { ...sitemapConfig as SitemapConfig, ...config.sitemap as Partial<SitemapConfig> | undefined }
  const locales = new Set(autoI18n?.strategy !== 'no_prefix' ? autoI18n?.locales?.map(locale => locale.code) : [])
  let match: ((path: string) => { sitemap?: false | object }) | undefined
  const hooks = nitro.hooks as unknown as SitemapHooks
  hooks.hook('sitemap:resolved', (ctx) => {
    const matchRoute = match ||= createNitroRouteRuleMatcher({
      app: config.app,
      nitro: { routeRules: defu(config.nitro?.routeRules, redirectRules) },
    })
    ctx.urls = ctx.urls.filter((url) => {
      const path = url._path?.pathname || url.loc
      let sitemap = matchRoute(path).sitemap
      // Match the same locale fallback as Sitemap's route-rule filter.
      if (sitemap == null && locales.size && path.startsWith('/')) {
        const end = path.indexOf('/', 1)
        if (end !== -1 && locales.has(path.slice(1, end)))
          sitemap = matchRoute(path.slice(end)).sitemap
      }
      return sitemap !== false
    })
  })
})
