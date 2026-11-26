import type { RedirectRule } from '../../shared/redirects'
import { createError, defineEventHandler, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { decodePath, joinURL, withoutBase } from 'ufo'
// @ts-expect-error Nitro supplies the compiled redirect rules.
import bundledRedirects from '#seo-utils-virtual/redirects.mjs'
import { appendSearch, createRedirectMatcher, isAbsoluteUrl, REDIRECT_CACHE_CONTROL, resolveTarget } from '../../shared/redirects'

let match: ((path: string) => RedirectRule | undefined) | undefined

export default defineEventHandler((e) => {
  const config = useRuntimeConfig()
  const override = config['seo-utils-redirects']
  match ||= createRedirectMatcher(Array.isArray(override) ? override as RedirectRule[] : bundledRedirects as RedirectRule[])
  const baseURL = config.app.baseURL
  const path = decodePath(withoutBase(e.url.pathname, baseURL))
  if (path.startsWith('/__nuxt_error'))
    return
  const rule = match(path)
  if (!rule)
    return
  if (rule._tag === 'Gone') {
    throw createError({ status: rule.statusCode, statusText: rule.statusCode === 410 ? 'Gone' : 'Not Found' })
  }
  const target = resolveTarget(rule, path)
  const location = isAbsoluteUrl(target) ? target : joinURL(baseURL, target)
  if (!e.res.headers.has('cache-control'))
    e.res.headers.set('cache-control', REDIRECT_CACHE_CONTROL)
  return sendRedirect(e, appendSearch(location, e.url.search), rule.statusCode)
})
