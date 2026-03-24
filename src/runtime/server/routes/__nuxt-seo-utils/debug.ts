import { getSiteConfig } from '#site-config/server/composables'
import { defineEventHandler } from 'h3'

export default defineEventHandler((e) => {
  const siteConfig = getSiteConfig(e)
  return {
    siteConfig: {
      url: siteConfig.url,
    },
  }
})
