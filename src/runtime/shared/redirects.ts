import { joinURL, withoutTrailingSlash } from 'ufo'

/** How an entry key matches request paths. `/old/**` matches `/old` and every path below it. */
export type SourcePattern
  = | { _tag: 'Exact', path: string }
    | { _tag: 'Prefix', prefix: string }

/** The part of an entry the server needs to answer a request. */
export type RedirectRule
  = | { _tag: 'Moved', pattern: SourcePattern, to: string, statusCode: 301 | 308 }
    | { _tag: 'Gone', pattern: SourcePattern, statusCode: 410 | 404 }

export type MovedRule = Extract<RedirectRule, { _tag: 'Moved' }>

export function normalizePath(path: string): string {
  return path === '/' ? path : withoutTrailingSlash(path)
}

export function isAbsoluteUrl(to: string): boolean {
  return /^https?:\/\//i.test(to)
}

/** Parse an entry key into a pattern, or return why the key is invalid. */
export function parseSourcePattern(source: string): SourcePattern | string {
  if (!source.startsWith('/') || source.startsWith('//'))
    return 'it must be a path that starts with `/`'
  if (/[?#]/.test(source))
    return 'route matching ignores the query string and hash, so remove them'
  const wildcard = source.endsWith('/**')
  const base = wildcard ? source.slice(0, -3) : source
  if (/\*|\/:/.test(base))
    return 'only a trailing `/**` is supported'
  if (wildcard) {
    const prefix = normalizePath(base || '/')
    return { _tag: 'Prefix', prefix: prefix === '/' ? '' : prefix }
  }
  return { _tag: 'Exact', path: normalizePath(base) }
}

export function matchesSource(pattern: SourcePattern, path: string): boolean {
  const normalized = normalizePath(path)
  if (pattern._tag === 'Exact')
    return pattern.path === normalized
  return normalized === (pattern.prefix || '/') || normalized.startsWith(`${pattern.prefix}/`)
}

/**
 * Index entries for lookup. An exact entry wins, then the longest matching prefix.
 * The path must not include `app.baseURL`, the query string, or the hash.
 */
export function createRedirectMatcher<T extends { pattern: SourcePattern }>(entries: readonly T[]): (path: string) => T | undefined {
  const exact = new Map<string, T>()
  const prefixes: T[] = []
  for (const entry of entries) {
    if (entry.pattern._tag === 'Exact')
      exact.set(entry.pattern.path, entry)
    else
      prefixes.push(entry)
  }
  const prefixLength = (entry: T) => entry.pattern._tag === 'Prefix' ? entry.pattern.prefix.length : 0
  prefixes.sort((a, b) => prefixLength(b) - prefixLength(a))
  return (path) => {
    const normalized = normalizePath(path)
    return exact.get(normalized) ?? prefixes.find(entry => matchesSource(entry.pattern, normalized))
  }
}

/** The target for a request path. A target ending in `/**` gets the path below the source prefix. */
export function resolveTarget(rule: MovedRule, path: string): string {
  if (!rule.to.endsWith('/**'))
    return rule.to
  const rest = rule.pattern._tag === 'Prefix' ? normalizePath(path).slice(rule.pattern.prefix.length) : ''
  return joinURL(rule.to.slice(0, -3) || '/', rest)
}

/** Keep the request query string. A query on the target comes first. */
export function appendSearch(target: string, search: string): string {
  if (!search || search === '?')
    return target
  const hashIndex = target.indexOf('#')
  const base = hashIndex === -1 ? target : target.slice(0, hashIndex)
  const hash = hashIndex === -1 ? '' : target.slice(hashIndex)
  return `${base}${base.includes('?') ? '&' : '?'}${search.replace(/^\?/, '')}${hash}`
}
