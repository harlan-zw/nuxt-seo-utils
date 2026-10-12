import type { RedirectRule, SourcePattern } from '../runtime/shared/redirects'
import { joinURL } from 'ufo'
import { createRedirectMatcher, isAbsoluteUrl, parseSourcePattern, resolveTarget } from '../runtime/shared/redirects'

/** A calendar date, such as `'2026-10-13'`. */
export type RedirectDate = `${number}-${number}-${number}`

interface RedirectMeta {
  /** The date you added the entry. The review clock starts here. */
  addedAt: RedirectDate
  /** The date you last decided to keep the entry. It restarts the review clock. */
  reviewedAt?: RedirectDate
  /** A private note for the site owner. Visitors never see it. */
  reason?: string
}

/** The old URL moved. Requests get a permanent redirect to `to`. */
export interface MovedUrl extends RedirectMeta {
  /** A path on this site, such as `/blog/new-post`, or an absolute URL. End it with `/**` to keep the rest of a `/**` source path. */
  to: string
  /** @default 301 */
  statusCode?: 301 | 308
}

/** The old URL has no replacement. Requests get the error page with this status. */
export interface GoneUrl extends RedirectMeta {
  to?: never
  statusCode: 410 | 404
}

export type RedirectInput = MovedUrl | GoneUrl

/**
 * Old URLs keyed by path, without `app.baseURL`.
 * A trailing `/**` matches the path and every path below it.
 */
export type Redirects = Record<string, RedirectInput>

export type RedirectEntry = RedirectRule & {
  source: string
  /** The review clock start. `undefined` when the entry has no valid date. */
  reviewFrom: Date | undefined
}

export type RedirectIssue
  = | { _tag: 'InvalidSource', level: 'error', source: string, reason: string }
    | { _tag: 'InvalidTarget', level: 'error', source: string, to: unknown, reason: string }
    | { _tag: 'InvalidStatusCode', level: 'error', source: string, statusCode: unknown }
    | { _tag: 'RedirectLoop', level: 'error', sources: string[] }
    | { _tag: 'InvalidDate', level: 'warn', source: string, field: 'addedAt' | 'reviewedAt', value: unknown }
    | { _tag: 'TargetGone', level: 'warn', source: string, to: string, statusCode: 410 | 404 }
    | { _tag: 'DueForReview', level: 'warn', source: string, target: string, since: string, days: number }
    | { _tag: 'ChainFlattened', level: 'info', source: string, hops: string[] }

export interface RedirectPlan {
  entries: RedirectEntry[]
  issues: RedirectIssue[]
}

export interface PlanRedirectsOptions {
  /** The current time. */
  now: Date
  /** Days after `addedAt` or `reviewedAt` until an entry is due for review. `false` turns the review off. */
  reviewAfterDays: number | false
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_HOPS = 10
const DAY_MS = 86_400_000
const MISSING_TARGET = 'set `to` for a moved URL, or `statusCode: 410` for a gone URL'

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !DATE_RE.test(value))
    return undefined
  const date = new Date(`${value}T00:00:00Z`)
  // `2026-02-31` parses to a March date, so compare the round trip
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : date
}

function parseEntry(source: string, input: RedirectInput): { entry?: RedirectEntry, issues: RedirectIssue[] } {
  const pattern = parseSourcePattern(source)
  if (typeof pattern === 'string')
    return { issues: [{ _tag: 'InvalidSource', level: 'error', source, reason: pattern }] }
  if (!input || typeof input !== 'object')
    return { issues: [{ _tag: 'InvalidTarget', level: 'error', source, to: input, reason: MISSING_TARGET }] }

  const issues: RedirectIssue[] = []
  const addedAt = parseDate(input.addedAt)
  if (!addedAt)
    issues.push({ _tag: 'InvalidDate', level: 'warn', source, field: 'addedAt', value: input.addedAt })
  const reviewedAt = input.reviewedAt === undefined ? undefined : parseDate(input.reviewedAt)
  if (input.reviewedAt !== undefined && !reviewedAt)
    issues.push({ _tag: 'InvalidDate', level: 'warn', source, field: 'reviewedAt', value: input.reviewedAt })
  const reviewFrom = reviewedAt && (!addedAt || reviewedAt > addedAt) ? reviewedAt : addedAt

  if (input.to === undefined) {
    if (input.statusCode !== 410 && input.statusCode !== 404) {
      issues.push(input.statusCode === undefined
        ? { _tag: 'InvalidTarget', level: 'error', source, to: undefined, reason: MISSING_TARGET }
        : { _tag: 'InvalidStatusCode', level: 'error', source, statusCode: input.statusCode })
      return { issues }
    }
    if (pattern._tag === 'Prefix' && pattern.prefix === '') {
      issues.push({ _tag: 'InvalidSource', level: 'error', source, reason: 'a gone URL cannot match every path' })
      return { issues }
    }
    return { entry: { _tag: 'Gone', source, pattern, statusCode: input.statusCode, reviewFrom }, issues }
  }

  const to: unknown = input.to
  if (typeof to !== 'string' || to.startsWith('//') || !(to.startsWith('/') || isAbsoluteUrl(to))) {
    issues.push({ _tag: 'InvalidTarget', level: 'error', source, to, reason: 'use a path that starts with `/`, or an absolute `https://` URL' })
    return { issues }
  }
  if (to.endsWith('/**') && pattern._tag !== 'Prefix') {
    issues.push({ _tag: 'InvalidTarget', level: 'error', source, to, reason: 'a target that ends in `/**` needs a source that ends in `/**`' })
    return { issues }
  }
  const statusCode = input.statusCode ?? 301
  if (statusCode !== 301 && statusCode !== 308) {
    issues.push({ _tag: 'InvalidStatusCode', level: 'error', source, statusCode })
    return { issues }
  }
  return { entry: { _tag: 'Moved', source, pattern, to, statusCode, reviewFrom }, issues }
}

/** The path a target lands on, or `undefined` for an absolute URL. */
function targetPath(to: string): string | undefined {
  return isAbsoluteUrl(to) ? undefined : to.split(/[?#]/)[0]
}

/**
 * Follow each moved entry through the other entries, so that every source reaches its final target in one hop.
 * A `/**` target flattens only through a `/**` source that covers its whole subtree.
 */
function flattenChains(entries: RedirectEntry[]): RedirectPlan {
  const match = createRedirectMatcher(entries)
  const issues: RedirectIssue[] = []
  const loops = new Set<string>()
  const resolved = entries.map((entry): RedirectEntry => {
    if (entry._tag !== 'Moved')
      return entry
    let to = entry.to
    const visited = [entry.source]
    const hops = [entry.source, entry.to]
    for (let i = 0; i < MAX_HOPS; i++) {
      const path = targetPath(to)
      if (path === undefined)
        break
      const wildcard = to.endsWith('/**')
      const lookup = wildcard ? path.slice(0, -3) || '/' : path
      const next = match(lookup)
      if (!next || (wildcard && next.pattern._tag !== 'Prefix'))
        break
      if (visited.includes(next.source)) {
        const key = [...new Set(visited)].sort().join('\n')
        if (!loops.has(key)) {
          loops.add(key)
          issues.push({ _tag: 'RedirectLoop', level: 'error', sources: [...visited, next.source] })
        }
        return entry
      }
      visited.push(next.source)
      if (next._tag === 'Gone') {
        issues.push({ _tag: 'TargetGone', level: 'warn', source: entry.source, to, statusCode: next.statusCode })
        break
      }
      if (wildcard)
        to = next.to.endsWith('/**') ? `${resolveTarget(next, lookup).replace(/\/$/, '')}/**` : next.to
      else
        to = resolveTarget(next, path) + to.slice(path.length)
      hops.push(to)
    }
    if (to === entry.to)
      return entry
    issues.push({ _tag: 'ChainFlattened', level: 'info', source: entry.source, hops })
    return { ...entry, to }
  })
  return { entries: resolved, issues }
}

function findDueForReview(entries: RedirectEntry[], { now, reviewAfterDays }: PlanRedirectsOptions): RedirectIssue[] {
  if (reviewAfterDays === false)
    return []
  return entries.flatMap((entry): RedirectIssue[] => {
    if (!entry.reviewFrom)
      return []
    const days = Math.floor((now.getTime() - entry.reviewFrom.getTime()) / DAY_MS)
    if (days < reviewAfterDays)
      return []
    return [{
      _tag: 'DueForReview',
      level: 'warn',
      source: entry.source,
      target: entry._tag === 'Moved' ? entry.to : String(entry.statusCode),
      since: entry.reviewFrom.toISOString().slice(0, 10),
      days,
    }]
  })
}

/**
 * Parse the `redirects` option, flatten redirect chains, and find the entries that are due for review.
 * An `error` issue means an entry cannot be served, so the caller must stop the build.
 */
export function planRedirects(input: Redirects | undefined, options: PlanRedirectsOptions): RedirectPlan {
  const parsed = Object.entries(input || {}).map(([source, value]) => parseEntry(source, value))
  const flattened = flattenChains(parsed.flatMap(p => p.entry ? [p.entry] : []))
  return {
    entries: flattened.entries,
    issues: [...parsed.flatMap(p => p.issues), ...flattened.issues, ...findDueForReview(flattened.entries, options)],
  }
}

export interface LocalePrefixConfig {
  strategy?: string
  defaultLocale?: string
  locales: { code: string }[]
}

/** The path prefixes that an i18n strategy adds, such as `['/fr', '/de']`. */
export function resolveLocalePrefixes(i18n: LocalePrefixConfig): string[] {
  if (!i18n.strategy || i18n.strategy === 'no_prefix')
    return []
  return i18n.locales
    .filter(locale => i18n.strategy !== 'prefix_except_default' || locale.code !== i18n.defaultLocale)
    .map(locale => `/${locale.code}`)
}

function withPrefix(prefix: string, pattern: SourcePattern): SourcePattern {
  return pattern._tag === 'Exact'
    ? { _tag: 'Exact', path: pattern.path === '/' ? prefix : `${prefix}${pattern.path}` }
    : { _tag: 'Prefix', prefix: `${prefix}${pattern.prefix}` }
}

function sourceKey(pattern: SourcePattern): string {
  return pattern._tag === 'Exact' ? pattern.path : `${pattern.prefix}/**`
}

/**
 * Copy each entry under every locale prefix, so `/old` also serves `/fr/old`.
 * An entry that already starts with a locale prefix, or that another entry already covers, stays as written.
 */
export function expandLocalePrefixes(entries: RedirectRule[], prefixes: string[]): RedirectRule[] {
  if (!prefixes.length)
    return entries
  const taken = new Set(entries.map(entry => sourceKey(entry.pattern)))
  const isPrefixed = (key: string) => prefixes.some(prefix => key === prefix || key.startsWith(`${prefix}/`))
  const expanded = entries.flatMap(entry => isPrefixed(sourceKey(entry.pattern))
    ? []
    : prefixes.flatMap((prefix): RedirectRule[] => {
        const pattern = withPrefix(prefix, entry.pattern)
        const key = sourceKey(pattern)
        if (taken.has(key))
          return []
        taken.add(key)
        if (entry._tag === 'Gone')
          return [{ ...entry, pattern }]
        return [{ ...entry, pattern, to: isAbsoluteUrl(entry.to) ? entry.to : joinURL(prefix, entry.to) }]
      }))
  return [...entries, ...expanded]
}

/** Strip build-only fields, so the server bundle holds only what a request needs. */
export function toRedirectRules(entries: RedirectEntry[]): RedirectRule[] {
  return entries.map(entry => entry._tag === 'Moved'
    ? { _tag: 'Moved', pattern: entry.pattern, to: entry.to, statusCode: entry.statusCode }
    : { _tag: 'Gone', pattern: entry.pattern, statusCode: entry.statusCode })
}

export function formatRedirectIssue(issue: RedirectIssue): string {
  switch (issue._tag) {
    case 'InvalidSource':
      return `\`${issue.source}\` is not a valid source: ${issue.reason}.`
    case 'InvalidTarget':
      return `\`${issue.source}\` has an invalid target ${JSON.stringify(issue.to)}: ${issue.reason}.`
    case 'InvalidStatusCode':
      return `\`${issue.source}\` has status code ${JSON.stringify(issue.statusCode)}. Use 301 or 308 with \`to\`, and 410 or 404 without it.`
    case 'RedirectLoop':
      return `Redirect loop: ${issue.sources.join(' → ')}. Remove one of these entries.`
    case 'InvalidDate':
      return `\`${issue.source}\` has ${issue.field} ${JSON.stringify(issue.value)}. Use a date such as '2026-10-13'. The entry still works, but the review check skips it.`
    case 'TargetGone':
      return `\`${issue.source}\` redirects to \`${issue.to}\`, which returns ${issue.statusCode}. Pick a live target, or make \`${issue.source}\` a gone URL.`
    case 'DueForReview':
      return `\`${issue.source}\` → ${issue.target} (since ${issue.since}, ${issue.days} days)`
    case 'ChainFlattened':
      return `${issue.hops.join(' → ')}. \`${issue.source}\` now redirects to \`${issue.hops.at(-1)}\` in one hop.`
  }
}

/** Group the issues into one message per log level. */
export function formatRedirectReport(issues: RedirectIssue[], reviewAfterDays: number | false): { error?: string, warn?: string, info?: string } {
  const lines = (level: RedirectIssue['level'], exclude?: RedirectIssue['_tag']) => issues
    .filter(issue => issue.level === level && issue._tag !== exclude)
    .map(issue => `  - ${formatRedirectIssue(issue)}`)
  const errors = lines('error')
  const warnings = lines('warn', 'DueForReview')
  const due = issues.filter(issue => issue._tag === 'DueForReview').map(issue => `  - ${formatRedirectIssue(issue)}`)
  const flattened = lines('info')
  const report: { error?: string, warn?: string, info?: string } = {}
  if (errors.length)
    report.error = `Invalid \`seo.redirects\` entries:\n${errors.join('\n')}`
  const warn = [
    ...(warnings.length ? [`Check these \`seo.redirects\` entries:\n${warnings.join('\n')}`] : []),
    ...(due.length
      ? [[
          `${due.length} \`seo.redirects\` ${due.length === 1 ? 'entry is' : 'entries are'} due for review (older than ${reviewAfterDays} days):`,
          ...due,
          '  If an old URL still gets visits or backlinks, keep it and set `reviewedAt` to today.',
          '  If it gets none, you can delete the entry.',
        ].join('\n')]
      : []),
  ]
  if (warn.length)
    report.warn = warn.join('\n')
  if (flattened.length)
    report.info = `Flattened \`seo.redirects\` chains:\n${flattened.join('\n')}`
  return report
}
