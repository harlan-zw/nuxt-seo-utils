import { createNitroRouteRuleMatcher } from 'nuxtseo-shared/server'

export interface RenderingRouteRule {
  ssr?: boolean
  prerender?: boolean
  robots?: boolean | string | { indexable?: boolean, noindex?: boolean, none?: boolean, rule?: string }
  redirect?: unknown
  proxy?: unknown
  headers?: Record<string, unknown>
}

export interface RenderingContext {
  ssr?: boolean
  indexable?: boolean
  routeRules?: Record<string, RenderingRouteRule>
}

export interface RenderingDiagnostic {
  _tag: 'ClientRendering'
  level: 'warn'
  path: string
}

const NOINDEX = /(?:^|,)\s*(?:noindex|none)\s*(?:,|$)/i
const NON_PAGE_PATH = /^\/(?:api|_nuxt|_nitro|__nuxt|\.well-known)(?:\/|$)/

function isIndexable(robots: RenderingRouteRule['robots']): boolean {
  if (robots === false)
    return false
  if (typeof robots === 'string')
    return !NOINDEX.test(robots)
  if (robots && typeof robots === 'object') {
    if (typeof robots.indexable === 'boolean')
      return robots.indexable
    return !robots.noindex && !robots.none && !(robots.rule && NOINDEX.test(robots.rule))
  }
  return true
}

/** Check declared rendering rules, with the same inheritance as runtime route rules. */
export function validateRendering(context: RenderingContext): RenderingDiagnostic[] {
  if (context.indexable === false)
    return []
  const routeRules = context.routeRules || {}
  const match = createNitroRouteRuleMatcher<RenderingRouteRule>({ nitro: { routeRules } })
  const candidates = [
    ...(context.ssr === false ? ['/**'] : []),
    ...Object.keys(routeRules),
  ]
  const diagnostics: RenderingDiagnostic[] = []
  for (const path of new Set(candidates)) {
    // Match the declared scope itself. One child exception cannot silence its parent.
    const rule = match(path)
    const contentType = Object.entries(rule.headers || {}).find(([name]) => name.toLowerCase() === 'content-type')?.[1]
    if ((context.ssr !== false && rule.ssr !== false) || !isIndexable(rule.robots)
      || NON_PAGE_PATH.test(path) || rule.redirect || rule.proxy
      || (typeof contentType === 'string' && !/^text\/html(?:;|$)/i.test(contentType))) {
      continue
    }
    if (diagnostics.some(diagnostic => diagnostic.path === '/**'))
      continue
    diagnostics.push({ _tag: 'ClientRendering', level: 'warn', path })
  }
  return diagnostics
}

export function formatRenderingDiagnostic(diagnostic: RenderingDiagnostic): string {
  return `SSR is disabled for indexable pages matching \`${diagnostic.path}\`. Crawlers and agents that skip JavaScript may miss their page content. Enable SSR for public pages. For private app pages, set \`robots: false\` on the route rule with Nuxt Robots.`
}
