import { defineEventHandler, getRequestHost, sendRedirect } from 'nuxt/server'
import { joinURL } from 'ufo'
import { getSiteConfig } from '#site-config/server/composables/getSiteConfig'

export default defineEventHandler((e) => {
  // avoid redirecting in prerender mode
  if (import.meta.prerender) {
    return
  }
  const path = e.url.pathname
  // we only care about routes getting indexed
  if (path.startsWith('/_nuxt') || path.startsWith('/api')) {
    return
  }
  // ignore files
  if (path.split('/').pop()?.includes('.')) {
    return
  }
  const siteConfig = getSiteConfig(e)
  if (!siteConfig.url || siteConfig.env !== 'production') {
    return
  }
  const siteConfigHostName = new URL(e.url.pathname, siteConfig.url).host
  const host = getRequestHost(e, { xForwardedHost: true })
  // check for redirect header
  if (e.req.headers.get('x-nuxt-seo-redirected') || host.includes('http') || host.replace('https://', '').includes(':')) {
    return
  }
  // if origin doesn't match site, do a redirect
  // we need to avoid redirect loops so check if the origin is already a redirect
  if (host.split(':')[0] !== siteConfigHostName.split(':')[0]) {
    // set a header to avoid redirect loops
    e.res.headers.set('x-nuxt-seo-redirected', 'true')
    return sendRedirect(e, joinURL(siteConfig.url, e.url.pathname + e.url.search), 301)
  }
})
