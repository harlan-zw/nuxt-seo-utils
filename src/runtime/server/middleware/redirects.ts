import type { RedirectRule } from '../../shared/redirects'
import { createError, defineEventHandler, sendRedirect, useRuntimeConfig } from 'nuxt/server'
import { decodePath, joinURL, withoutBase } from 'ufo'
import { appendSearch, createRedirectMatcher, isAbsoluteUrl, resolveTarget } from '../../shared/redirects'

let match: ((path: string) => RedirectRule | undefined) | undefined

export default defineEventHandler((e) => {
  const config = useRuntimeConfig()
  match ||= createRedirectMatcher(config['seo-utils-redirects'] as RedirectRule[])
  const baseURL = config.app.baseURL
  const path = decodePath(withoutBase(e.url.pathname, baseURL))
  const rule = match(path)
  if (!rule)
    return
  if (rule._tag === 'Gone') {
    throw createError({ status: rule.statusCode, statusText: rule.statusCode === 410 ? 'Gone' : 'Not Found' })
  }
  const target = resolveTarget(rule, path)
  const location = isAbsoluteUrl(target) ? target : joinURL(baseURL, target)
  // Without a max-age, Chromium caches a 301 or 308 forever, so a later fix or removal never reaches returning visitors
  if (!e.res.headers.has('cache-control'))
    e.res.headers.set('cache-control', 'public, max-age=3600')
  return sendRedirect(e, appendSearch(location, e.url.search), rule.statusCode)
})
