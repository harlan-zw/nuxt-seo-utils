import type { HeadEntry, Unhead } from 'unhead/types'
import { TagPriorityAliases } from '@unhead/vue/utils'
import { readEntry } from 'unhead/compiled'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'
import { needsAbsoluteImageUrl } from './absoluteImageUrls'

/**
 * One head entry as head input, read by `readEntry`, so its values have settled. `input` is
 * `undefined` when it holds keys this module cannot read. `priority` is set when the entry has a
 * `tagPriority` option, which applies to each of its tags. `flat` marks the meta tags of a
 * `useSeoMeta` call, which take their own order.
 */
export interface EntryInput {
  input: Record<string, any> | undefined
  priority: boolean
  tagPriority?: unknown
  flat?: boolean
  /** The entry of the default canonical link, whose href the default `og:url` already holds. */
  defaultCanonical?: boolean
}

/** A head `readEntry` reads: its entries, prop resolvers, and plugins. */
export type ReadableHead = Unhead<any, any>

/** Reads one entry of `head` through `readEntry`. On the server, its values settle now, as the head render would settle them. */
export function readEntryInput(entry: HeadEntry<any>, head: ReadableHead, defaultCanonical?: object): EntryInput {
  const tagPriority = entry.options?.tagPriority
  const { input, seoMeta, compiled } = readEntry(entry, head)
  return {
    input: readableInput(input),
    priority: tagPriority !== undefined,
    tagPriority,
    flat: seoMeta && !compiled,
    defaultCanonical: !!defaultCanonical && entry === defaultCanonical,
  }
}

/**
 * Reads every entry of `head`: compiled tags, normal input, or a pending patch. A read that
 * settles an entry can replace it, so the loop reads the live map, which visits the new entry.
 */
export function readEntryInputs(head: ReadableHead, defaultCanonical?: object): EntryInput[] {
  const reads: [HeadEntry<any>, EntryInput][] = []
  for (const entry of head.entries.values())
    reads.push([entry, readEntryInput(entry, head, defaultCanonical)])
  // a replaced entry renders nothing
  const live = new Set(head.entries.values())
  return reads.filter(([entry]) => live.has(entry)).map(([, read]) => read)
}

// The top level keys of head input
const HEAD_KEYS = new Set(['title', 'titleTemplate', 'templateParams', 'htmlAttrs', 'bodyAttrs', 'base', 'script', 'style', 'noscript', 'link', 'meta'])

/**
 * Read input as plain head input, or `undefined` when it holds keys this module cannot read,
 * such as the flat meta of a `useSeoMeta` call on a head with no flat meta plugin.
 */
export function readableInput(input: unknown): Record<string, any> | undefined {
  if (input === null || input === undefined)
    return {}
  if (typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype)
    return undefined
  return Object.keys(input).every(key => HEAD_KEYS.has(key)) ? input as Record<string, any> : undefined
}

function list(value: unknown): Record<string, any>[] {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(item => item && typeof item === 'object')
}

const metaKey = (meta: Record<string, any>): unknown => meta.property ?? meta.name

// The tags whose fate follows the `og:image` of their entry: `og:image:*`, and the public
// `twitter:image` copy, keyed as such.
function ogImageDependents(meta: Record<string, any>[]): string[] {
  return meta
    .filter(tag => String(metaKey(tag)).startsWith('og:image:') || (typeof tag.key === 'string' && tag.key.startsWith(TWITTER_IMAGE_FALLBACK_KEY)))
    .map(tag => String(metaKey(tag)))
}

const isImageTag = (meta: Record<string, any>) => /^(?:og|twitter):image/.test(String(metaKey(meta)))

export interface DerivedTagsContext {
  /** The default `og:url` has `low` priority, so any `og:url` without a priority wins over it. */
  ogUrlYields: boolean
}

/**
 * What the derived tags plugin would change:
 *
 * - `None`: nothing.
 * - `OgUrl`: only the content of the default `og:url`, which follows the canonical link that
 *   wins. `false` drops it. Setting this content on the default entry gives the same output.
 * - `Plugin`: something only the plugin can decide.
 */
export type DerivedTagsPlan
  = | { _tag: 'None' }
    | { _tag: 'OgUrl', content: string | false }
    | { _tag: 'Plugin' }

const PLUGIN: DerivedTagsPlan = { _tag: 'Plugin' }

// The capo weight of a canonical link, as Unhead sorts it before deduplication. A priority on the
// entry replaces the priority of its tags. `undefined` means only the plugin order decides.
function canonicalWeight(priority: unknown): number | undefined {
  if (typeof priority === 'number')
    return priority
  if (priority === undefined)
    return 100
  const offset = (TagPriorityAliases as Record<string, number>)[String(priority)]
  return offset === undefined ? undefined : 100 + offset
}

/**
 * Plans the work of the derived tags plugin. It never misses a change: when in doubt it says
 * `Plugin`, and the plugin runs as it does without compiler mode.
 *
 * - The default `og:url` follows the canonical link. A canonical link from another entry
 *   changes it, unless its href is the default `og:url` content, or another entry sets an
 *   `og:url` that wins. Deduplication keeps the canonical link with the lowest weight, and the
 *   last one of those.
 * - The `og:image:*` tags of an entry whose `og:image` lost are dropped. Without priorities, the
 *   last `og:image` wins, and a dropped tag changes nothing if a later entry replaces it.
 */
export function planDerivedTags(entries: EntryInput[], { ogUrlYields }: DerivedTagsContext): DerivedTagsPlan {
  const otherCanonicalHrefs: unknown[] = []
  const canonicals: { weight: number | undefined, href: unknown }[] = []
  let defaultOgUrl: unknown
  let ownOgUrl = false
  let otherOgUrl = false
  const imageEntries: Record<string, any>[][] = []
  for (const entry of entries) {
    const input = entry.input
    if (!input)
      return PLUGIN
    const meta = list(input.meta)
    for (const link of list(input.link).filter(link => link.rel === 'canonical')) {
      canonicals.push({ weight: canonicalWeight(entry.tagPriority ?? link.tagPriority), href: link.href })
      if (!entry.defaultCanonical)
        otherCanonicalHrefs.push(link.href)
    }
    defaultOgUrl = meta.find(tag => tag.key === OG_URL_KEY)?.content ?? defaultOgUrl
    if (meta.some(tag => metaKey(tag) === 'og:url' && tag.key !== OG_URL_KEY))
      otherOgUrl = true
    if (!entry.priority && meta.some(tag => metaKey(tag) === 'og:url' && tag.key !== OG_URL_KEY && tag.tagPriority === undefined))
      ownOgUrl = true
    // a priority on the entry applies to each of its tags
    if (meta.some(isImageTag))
      imageEntries.push(entry.priority ? meta.map(tag => ({ ...tag, tagPriority: tag.tagPriority ?? 'entry' })) : meta)
  }
  if (ogImageTagsChange(imageEntries))
    return PLUGIN
  // Whichever canonical link wins, the default `og:url` keeps its content when every href matches it
  const ogUrlFollows = otherCanonicalHrefs.some(href => typeof defaultOgUrl !== 'string' || href !== defaultOgUrl)
  if (!ogUrlFollows || (ogUrlYields && ownOgUrl))
    return { _tag: 'None' }
  if (canonicals.some(link => link.weight === undefined))
    return PLUGIN
  // sorted by weight, a later link of the same weight replaces an earlier one
  const winner = canonicals.reduce((best, link) => link.weight! <= best.weight! ? link : best)
  const href = winner.href
  // a template param in the href resolves later, in the content of each tag that holds it
  if (typeof href === 'string' && href.includes('%'))
    return PLUGIN
  const content = typeof href === 'string' && href ? href : false
  if (content === defaultOgUrl)
    return { _tag: 'None' }
  // The plugin drops the default tag after deduplication. Without content it may not dedupe as
  // that tag did, so an og:url of another entry decides.
  if (content === false && otherOgUrl)
    return PLUGIN
  return { _tag: 'OgUrl', content }
}

/** Whether the derived tags plugin could change the output. */
export function needsDerivedTags(entries: EntryInput[], context: DerivedTagsContext): boolean {
  return planDerivedTags(entries, context)._tag !== 'None'
}

// Whether the plugin drops the `og:image:*` tags of an entry whose `og:image` lost
function ogImageTagsChange(imageEntries: Record<string, any>[][]): boolean {
  const ogImageEntries = imageEntries.filter(meta => meta.some(tag => metaKey(tag) === 'og:image'))
  if (ogImageEntries.length < 2)
    return false
  if (imageEntries.some(meta => meta.some(tag => isImageTag(tag) && tag.tagPriority !== undefined)))
    return true
  // every image entry but the last loses its `og:image`
  return ogImageEntries.slice(0, -1).some((meta) => {
    const later = imageEntries.slice(imageEntries.indexOf(meta) + 1).flatMap(laterMeta => laterMeta.map(tag => String(metaKey(tag))))
    return ogImageDependents(meta).some(key => !later.includes(key))
  })
}

/** Whether head input holds an image meta tag that needs an absolute URL. */
export function holdsImageMeta(input: Record<string, any>): boolean {
  return list(input.meta).some(meta => needsAbsoluteImageUrl('meta', meta))
}

/**
 * Makes the image URLs of resolved head input absolute, as the absolute image URLs plugin does
 * after the tags resolve. Returns `undefined` when nothing changes, and `'Plugin'` when a URL holds
 * a template param, whose result only the plugin order decides.
 */
export function absoluteImageInput(input: Record<string, any>, resolve: (path: string) => string): Record<string, any> | 'Plugin' | undefined {
  let changed = false
  const meta = list(input.meta).map((props) => {
    if (!needsAbsoluteImageUrl('meta', props))
      return props
    if (props.content.includes('%'))
      return undefined
    changed = true
    return { ...props, content: resolve(props.content) }
  })
  if (meta.includes(undefined))
    return 'Plugin'
  return changed ? { ...input, meta } : undefined
}

/**
 * The server entries whose image URLs must become absolute, each with its new normal input.
 * Returns `'Plugin'` when input it cannot read or a template param leaves only the plugin able
 * to decide. Reading an entry settles its values: they settle when the app has rendered, not at
 * the head render.
 */
export function absoluteImageEntries(head: ReadableHead, resolve: (path: string) => string): [HeadEntry<any>, Record<string, any>][] | 'Plugin' {
  const rewrites: [HeadEntry<any>, Record<string, any>][] = []
  for (const entry of head.entries.values()) {
    const read = readEntryInput(entry, head)
    const resolved = read.input
    if (!resolved)
      return 'Plugin'
    if (!holdsImageMeta(resolved))
      continue
    // Flat meta tags take their own order, so only the plugin rewrites them
    if (read.flat)
      return 'Plugin'
    // Settled input is plain data. A server entry renders once, so it may replace refs.
    const input = absoluteImageInput(resolved, resolve)
    if (input === 'Plugin')
      return 'Plugin'
    if (input)
      rewrites.push([entry, input])
  }
  return rewrites
}
