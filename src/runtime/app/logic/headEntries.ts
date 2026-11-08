import { TagPriorityAliases, VueResolver, walkResolver } from '@unhead/vue/utils'
import { readCompiledEntry, toHeadInput } from 'unhead/compiled'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'
import { needsAbsoluteImageUrl } from './absoluteImageUrls'

/**
 * One head entry as head input. A compiled entry holds plain tag lists, where a dynamic value
 * that has not resolved reads as `UNRESOLVED`. Normal input has its refs and getters resolved,
 * as the head resolves them at the render. `priority` is set when the entry has a `tagPriority`
 * option, which applies to each of its tags.
 */
export type EntryInput
  = | { _tag: 'Compiled', input: Record<string, any>, compiledTags: unknown, priority: boolean, tagPriority?: unknown }
    | { _tag: 'Loose', input: unknown, priority: boolean, tagPriority?: unknown }

/** Stands in for a dynamic value that has not resolved. It is never a URL. */
export const UNRESOLVED = '\u0000unresolved'

const unresolvedValues = new Proxy([], { get: (target, key) => typeof key === 'string' && /^\d+$/.test(key) ? UNRESOLVED : Reflect.get(target, key) })

interface InternalEntry {
  input: unknown
  options?: { values?: unknown, tagPriority?: unknown }
  _pending?: unknown
}

// The keys whose tags this module reads. Their getters run here, as the head runs them at the render.
const TAG_KEYS = new Set(['meta', 'link', '_flatMeta'])

/**
 * Resolves the refs and getters of the meta and link tags of normal input. A getter elsewhere,
 * such as a style getter, may have side effects, so it never runs here. Neither does a getter
 * for the whole input: such input stays a function, which no reader can read.
 */
function resolveTagInput(input: unknown): unknown {
  const value = VueResolver(undefined, input)
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype)
    return value
  const out: Record<string, unknown> = {}
  for (const key in value)
    out[key] = TAG_KEYS.has(key) ? walkResolver((value as Record<string, unknown>)[key], VueResolver, key) : (value as Record<string, unknown>)[key]
  return out
}

/**
 * Reads the entries of a compiled server head or a lazy client head, with the values of each
 * compiled entry left unresolved until they settle. Loose input is read from its pending patch
 * first, as `readCompiledEntry` does for compiled tags, and its meta and link tags resolve.
 */
export function readEntryInputs(entries: Iterable<InternalEntry>): EntryInput[] {
  const out: EntryInput[] = []
  for (const entry of entries) {
    const tagPriority = entry.options?.tagPriority
    const priority = tagPriority !== undefined
    const read = readCompiledEntry(entry as any)
    if (read) {
      const values = Array.isArray(read.values) ? read.values : undefined
      out.push({ _tag: 'Compiled', compiledTags: read.tags, input: toHeadInput(read.tags, values ?? unresolvedValues), priority, tagPriority })
    }
    else {
      // `readCompiledEntry` reads compiled tags only. A patch with loose input waits in
      // `_pending`, a field of the public `HeadEntry` type, until the head resolves it.
      out.push({ _tag: 'Loose', input: resolveTagInput(entry._pending ?? entry.input), priority, tagPriority })
    }
  }
  return out
}

const mayDeriveFrom = (input: Record<string, any>) => list(input.link).some(link => link.rel === 'canonical') || list(input.meta).some(tag => metaKey(tag) === 'og:url')

/**
 * Resolves the values of each compiled server entry that holds a canonical link or an `og:url`,
 * so `needsDerivedTags` compares their hrefs. The head resolves them at its render anyway, and
 * the server pushes nothing after the app has rendered. Unhead has no public way to settle the
 * values of an entry: reading the `input` getter of a compiled server entry runs its value function.
 */
export function settleDerivedTagValues(entries: Iterable<InternalEntry>): void {
  for (const entry of entries) {
    const read = readCompiledEntry(entry as any)
    if (read && !read.values && mayDeriveFrom(toHeadInput(read.tags, unresolvedValues)))
      void entry.input
  }
}

// The top level keys of head input. Other keys, such as `_flatMeta`, can hold anything.
const HEAD_KEYS = new Set(['title', 'titleTemplate', 'templateParams', 'htmlAttrs', 'bodyAttrs', 'base', 'script', 'style', 'noscript', 'link', 'meta'])

/** `unpackMeta` from `@unhead/vue/utils`. A caller passes it, so the client bundle can leave it out. */
export type UnpackMeta = (input: any) => Record<string, any>[]

/**
 * Resolved normal input as plain head input, or `undefined` when it holds keys this module cannot
 * read. With `unpack`, the `_flatMeta` of a `useSeoMeta` call unpacks to meta tags after the
 * others, as Unhead's `FlatMetaPlugin` does. Such input is for reading only: `flat` tells a
 * caller not to write it back.
 */
export function readableInput(input: unknown, unpack?: UnpackMeta): (Record<string, any> & { flat?: true }) | undefined {
  if (input === null || input === undefined)
    return {}
  if (typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype)
    return undefined
  const { _flatMeta, ...rest } = input as Record<string, any>
  if (!Object.keys(rest).every(key => HEAD_KEYS.has(key)))
    return undefined
  if (_flatMeta === undefined)
    return input as Record<string, any>
  if (!unpack || !_flatMeta || typeof _flatMeta !== 'object')
    return undefined
  return { ...rest, meta: [...list(rest.meta), ...unpack(_flatMeta)], flat: true }
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
  /** The compiled tags of the default canonical link. */
  defaultCanonicalTags: unknown
  /** The default `og:url` has `low` priority, so any `og:url` without a priority wins over it. */
  ogUrlYields: boolean
  /** Reads the flat meta of `useSeoMeta` input. Without it, such input needs the plugin. */
  unpackMeta?: UnpackMeta
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
export function planDerivedTags(entries: EntryInput[], { defaultCanonicalTags, ogUrlYields, unpackMeta }: DerivedTagsContext): DerivedTagsPlan {
  const otherCanonicalHrefs: unknown[] = []
  const canonicals: { weight: number | undefined, href: unknown }[] = []
  let defaultOgUrl: unknown
  let ownOgUrl = false
  let otherOgUrl = false
  const imageEntries: Record<string, any>[][] = []
  for (const entry of entries) {
    const input = entry._tag === 'Compiled' ? entry.input : readableInput(entry.input, unpackMeta)
    if (!input)
      return PLUGIN
    const meta = list(input.meta)
    const isDefaultCanonical = entry._tag === 'Compiled' && entry.compiledTags === defaultCanonicalTags
    for (const link of list(input.link).filter(link => link.rel === 'canonical')) {
      canonicals.push({ weight: canonicalWeight(entry.tagPriority ?? link.tagPriority), href: link.href })
      if (!isDefaultCanonical)
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
  const ogUrlFollows = otherCanonicalHrefs.some(href => typeof defaultOgUrl !== 'string' || href !== defaultOgUrl || defaultOgUrl === UNRESOLVED)
  if (!ogUrlFollows || (ogUrlYields && ownOgUrl))
    return { _tag: 'None' }
  if (canonicals.some(link => link.weight === undefined))
    return PLUGIN
  // sorted by weight, a later link of the same weight replaces an earlier one
  const winner = canonicals.reduce((best, link) => link.weight! <= best.weight! ? link : best)
  const href = winner.href
  // a template param in the href resolves later, in the content of each tag that holds it
  if (href === UNRESOLVED || (typeof href === 'string' && href.includes('%')))
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

/** Whether a compiled entry holds an image meta tag that may need an absolute URL. */
export function holdsImageMeta(input: Record<string, any>): boolean {
  return list(input.meta).some(meta => needsAbsoluteImageUrl('meta', meta) || meta.content === UNRESOLVED)
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
 * Returns `'Plugin'` when normal input or a template param leaves only the plugin able to decide.
 * It resolves the values of an entry with an image meta tag: they resolve when the app has
 * rendered, not at the head render.
 */
export function absoluteImageEntries<T extends InternalEntry>(entries: Iterable<T>, resolve: (path: string) => string, unpackMeta?: UnpackMeta): [T, Record<string, any>][] | 'Plugin' {
  const rewrites: [T, Record<string, any>][] = []
  for (const entry of entries) {
    const [read] = readEntryInputs([entry])
    // Resolved normal input is plain data. A server entry renders once, so it may replace refs.
    const resolved = read!._tag === 'Loose' ? readableInput(read!.input, unpackMeta) : read!.input
    if (!resolved)
      return 'Plugin'
    if (!holdsImageMeta(resolved))
      continue
    // Flat meta tags take their own order, so only the plugin rewrites them
    if (resolved.flat)
      return 'Plugin'
    // the `input` getter of a compiled server entry resolves its values
    const input = absoluteImageInput(read!._tag === 'Loose' ? resolved : entry.input as Record<string, any>, resolve)
    if (input === 'Plugin')
      return 'Plugin'
    if (input)
      rewrites.push([entry, input])
  }
  return rewrites
}
