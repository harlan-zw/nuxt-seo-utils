import type { RedirectRule } from '../runtime/shared/redirects'
import { joinURL, withoutTrailingSlash } from 'ufo'
import { isAbsoluteUrl, REDIRECT_CACHE_CONTROL, resolveTarget } from '../runtime/shared/redirects'

/**
 * How a static build serves `seo.redirects`.
 * A native host gets redirect rules in the file that its Nitro preset writes.
 * Every other host gets an instant meta refresh page for each exact moved URL.
 */
export type StaticHost
  = | { _tag: 'Netlify' }
    | { _tag: 'CloudflarePages' }
    | { _tag: 'Vercel' }
    | { _tag: 'MetaRefresh', reason: string }

export type NativeHost = Exclude<StaticHost, { _tag: 'MetaRefresh' }>

/** A route rule redirect for the Nitro preset writer. Nitro 2 reads `statusCode` and Nitro 3 reads `status`. */
export interface NativeRedirect {
  to: string
  statusCode: number
  status: number
}

/** A route in the Vercel Build Output API `config.json`. */
export interface VercelRoute {
  src: string
  status: number
  headers?: Record<string, string>
  dest?: string
}

/**
 * `RouteRules` holds route rules in insertion order. The Nitro writers sort them by depth, then reverse them.
 * So for equal depth, the last key comes first in `_redirects`.
 * `VercelRoutes` holds routes in match order, for the `vercel.config.routes` Nitro option.
 */
export type NativeRedirectOutput
  = | { _tag: 'RouteRules', redirects: [key: string, redirect: NativeRedirect][] }
    | { _tag: 'VercelRoutes', routes: VercelRoute[] }

export interface NativeRedirectPlan {
  output: NativeRedirectOutput
  /** Gone entries that the host cannot serve with their status. They get the host 404 page. */
  unserved: { _tag: 'NoGoneStatus' | 'NoErrorPage', sources: string[] } | undefined
}

export interface NativeRedirectContext {
  /** The Nitro `baseURL`, which is `app.baseURL`. */
  baseURL: string
  /** `true` when the build wrote `404.html`, which a gone URL serves as its body. */
  errorPage: boolean
}

const ERROR_PAGE = '/404.html'

const HOST_NAMES: Record<NativeHost['_tag'], string> = {
  Netlify: 'Netlify',
  CloudflarePages: 'Cloudflare Pages',
  Vercel: 'Vercel',
}

function isRootBase(baseURL: string): boolean {
  return (withoutTrailingSlash(baseURL) || '/') === '/'
}

/** Pick how a static build with this Nitro preset serves `seo.redirects`. */
export function resolveStaticHost(preset: string, baseURL: string): StaticHost {
  switch (preset) {
    case 'netlify-static':
      // Nitro writes `_redirects` into `dist/<baseURL>/`, but Netlify reads it only from the publish root
      return isRootBase(baseURL)
        ? { _tag: 'Netlify' }
        : { _tag: 'MetaRefresh', reason: 'Nitro writes the Netlify `_redirects` file inside `app.baseURL`, and Netlify does not read it there.' }
    case 'cloudflare-pages-static':
      return { _tag: 'CloudflarePages' }
    case 'vercel-static':
      return { _tag: 'Vercel' }
    default:
      return { _tag: 'MetaRefresh', reason: `The \`${preset}\` preset writes no host redirect file.` }
  }
}

function sourceKey(rule: RedirectRule): string {
  return rule.pattern._tag === 'Exact' ? rule.pattern.path : `${rule.pattern.prefix}/**`
}

/**
 * Add an exact rule for the path of each `/**` source, because a host splat can miss the path itself.
 * An exact entry for the same path wins. The result is in match order: exact paths, then the longest prefix.
 */
function withPrefixPaths(rules: RedirectRule[]): RedirectRule[] {
  const exact = new Set(rules.flatMap(rule => rule.pattern._tag === 'Exact' ? [rule.pattern.path] : []))
  const prefixPaths = rules.flatMap((rule): RedirectRule[] => {
    if (rule.pattern._tag !== 'Prefix')
      return []
    const path = rule.pattern.prefix || '/'
    if (exact.has(path))
      return []
    exact.add(path)
    const pattern = { _tag: 'Exact', path } as const
    return [rule._tag === 'Moved' ? { ...rule, pattern, to: resolveTarget(rule, path) } : { ...rule, pattern }]
  })
  const prefixLength = (rule: RedirectRule) => rule.pattern._tag === 'Prefix' ? rule.pattern.prefix.length : Infinity
  return [...rules, ...prefixPaths].sort((a, b) => prefixLength(b) - prefixLength(a))
}

/** The target with a trailing `/**` replaced by the `_redirects` splat. */
function toSplat(to: string): string {
  return to.endsWith('/**') ? `${to.slice(0, -3)}/:splat` : to
}

/** A path without its trailing slash. The root path becomes an empty string. */
function trimSlash(path: string): string {
  return path === '/' ? '' : withoutTrailingSlash(path)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function vercelRoute(rule: RedirectRule, baseURL: string): VercelRoute {
  const path = trimSlash(joinURL(baseURL, rule.pattern._tag === 'Exact' ? rule.pattern.path : rule.pattern.prefix || '/'))
  const src = rule.pattern._tag === 'Prefix'
    ? `^${escapeRegExp(path)}/(.*)$`
    : path ? `^${escapeRegExp(path)}/?$` : '^/$'
  if (rule._tag === 'Gone')
    return { src, status: rule.statusCode, dest: joinURL(baseURL, ERROR_PAGE) }
  const wildcard = rule.to.endsWith('/**')
  const target = wildcard ? rule.to.slice(0, -3) || '/' : rule.to
  const location = isAbsoluteUrl(target) ? target : joinURL(baseURL, target)
  return {
    src,
    status: rule.statusCode,
    headers: {
      'Location': wildcard ? `${trimSlash(location)}/$1` : location,
      'cache-control': REDIRECT_CACHE_CONTROL,
    },
  }
}

function nativeRedirect(to: string, statusCode: number): NativeRedirect {
  return { to, statusCode, status: statusCode }
}

/**
 * Turn the redirect rules into the input of a native host file.
 *
 * - Netlify: route rules for `_redirects`. A gone URL rewrites to `404.html` with its status. Nitro maps 308 to 301.
 * - Cloudflare Pages: route rules for `_redirects`. Nitro adds `baseURL`. `_redirects` has no 404 or 410.
 * - Vercel: anchored routes for `config.json`. Route rules cannot express `baseURL`, an optional trailing slash, or a 410 with a body.
 */
export function planNativeRedirects(rules: RedirectRule[], host: NativeHost, ctx: NativeRedirectContext): NativeRedirectPlan {
  const servesGone = host._tag !== 'CloudflarePages' && ctx.errorPage
  const served = withPrefixPaths(rules.filter(rule => rule._tag === 'Moved' || servesGone))
  const gone = rules.filter(rule => rule._tag === 'Gone')
  // Cloudflare Pages serves its 404 page for an unmatched path, which is right for a 404 entry
  const unservedGone = servesGone ? [] : gone.filter(rule => host._tag !== 'CloudflarePages' || rule.statusCode === 410)
  const unserved = unservedGone.length
    ? { _tag: host._tag === 'CloudflarePages' ? 'NoGoneStatus' as const : 'NoErrorPage' as const, sources: unservedGone.map(sourceKey) }
    : undefined

  if (host._tag === 'Vercel')
    return { output: { _tag: 'VercelRoutes', routes: served.map(rule => vercelRoute(rule, ctx.baseURL)) }, unserved }
  // Nitro converts a `/**` target to `:splat` for Netlify only, so the plan converts it for both hosts
  const redirects = served.map((rule): [string, NativeRedirect] => [
    sourceKey(rule),
    rule._tag === 'Moved' ? nativeRedirect(toSplat(rule.to), rule.statusCode) : nativeRedirect(ERROR_PAGE, rule.statusCode),
  ])
  return { output: { _tag: 'RouteRules', redirects: redirects.reverse() }, unserved }
}

/** The source keys that a native host serves, so the prerender crawler must not write a page for them. */
export function nativeSourceKeys(rules: RedirectRule[]): string[] {
  return [...new Set(withPrefixPaths(rules).map(sourceKey))]
}

export function formatUnservedGone(host: NativeHost, unserved: NonNullable<NativeRedirectPlan['unserved']>): string {
  const name = HOST_NAMES[host._tag]
  const intro = unserved._tag === 'NoGoneStatus'
    ? `${name} cannot send 410 from \`_redirects\`. These gone URLs return the host 404 page instead:`
    : `The build has no \`404.html\` page, so ${name} cannot serve these gone URLs. They return the host 404 page:`
  return [intro, ...unserved.sources.map(source => `  - ${source}`)].join('\n')
}

export function formatMetaRefreshFallback(reason: string, unserved: string[]): string {
  return [
    `${reason} So this static build cannot send a redirect or 410 status.`,
    'Each exact moved URL gets an HTML page with an instant meta refresh.',
    ...(unserved.length
      ? ['These entries need host redirect rules, or they return the host 404 page:', ...unserved.map(source => `  - ${source}`)]
      : []),
  ].join('\n')
}
