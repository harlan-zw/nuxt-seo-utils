import { getSiteConfig } from '#site-config/server/composables'
import { defineEventHandler, getQuery } from 'h3'
import { useRuntimeConfig } from 'nitropack/runtime'

export default defineEventHandler((e) => {
  const siteConfig = getSiteConfig(e)
  const runtimeConfig = useRuntimeConfig(e)
  const seoUtils = runtimeConfig.public?.['seo-utils'] || {}
  const headConfig = runtimeConfig['seo-utils-head'] || { link: [], meta: [] }
  const query = getQuery(e)
  return {
    runtimeConfig: {
      version: runtimeConfig.public?.['nuxt-seo-utils-version'] || 'unknown',
      ...seoUtils,
    },
    siteConfig: {
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.description,
      env: siteConfig.env,
      indexable: siteConfig.indexable,
      trailingSlash: siteConfig.trailingSlash,
      titleSeparator: siteConfig.separator,
      defaultLocale: siteConfig.defaultLocale,
      currentLocale: siteConfig.currentLocale,
      twitter: siteConfig.twitter,
    },
    headConfig,
    path: query.path || '/',
  }
})
