import { readCompiledEntry, toHeadInput } from 'unhead/compiled'
import { OG_URL_KEY, TWITTER_IMAGE_FALLBACK_KEY } from '../../shared/derivedTagKeys'
import { needsAbsoluteImageUrl } from './absoluteImageUrls'

/**
 * One head entry as head input. A compiled entry holds plain tag lists, where a dynamic value
 * that has not resolved reads as `UNRESOLVED`. Normal input may hold refs and getters.
 */
export type EntryInput
  = | { _tag: 'Compiled', input: Record<string, any>, compiledTags: unknown }
    | { _tag: 'Loose', input: unknown }

/** Stands in for a dynamic value that has not resolved. It is never a URL. */
export const UNRESOLVED = '\u0000unresolved'

const unresolvedValues = new Proxy([], { get: (target, key) => typeof key === 'string' && /^\d+$/.test(key) ? UNRESOLVED : Reflect.get(target, key) })

interface InternalEntry {
  input: unknown
  options?: { values?: unknown }
  _pending?: unknown
}

/**
 * Reads the entries of a compiled server head or a lazy client head, with the values of each
 * compiled entry left unresolved until they settle. Loose input is read from its pending patch
 * first, as `readCompiledEntry` does for compiled tags.
 */
export function readEntryInputs(entries: Iterable<InternalEntry>): EntryInput[] {
  const out: EntryInput[] = []
  for (const entry of entries) {
    const read = readCompiledEntry(entry as any)
    if (read) {
      const values = Array.isArray(read.values) ? read.values : undefined
      out.push({ _tag: 'Compiled', compiledTags: read.tags, input: toHeadInput(read.tags, values ?? unresolvedValues) })
    }
    else {
      // `readCompiledEntry` reads compiled tags only. A patch with loose input waits in
      // `_pending`, a field of the public `HeadEntry` type, until the head resolves it.
      out.push({ _tag: 'Loose', input: entry._pending ?? entry.input })
    }
  }
  return out
}

// Top level keys that can never hold a meta or link tag
const TAG_FREE_KEYS = new Set(['title', 'titleTemplate', 'templateParams', 'htmlAttrs', 'bodyAttrs', 'base', 'script', 'style', 'noscript'])

/** Whether normal input may hold a meta or link tag. Input that is not a plain object may hold anything. */
export function mayHoldMetaOrLink(input: unknown): boolean {
  if (!input || typeof input !== 'object' || Object.getPrototypeOf(input) !== Object.prototype)
    return true
  return Object.keys(input).some(key => !TAG_FREE_KEYS.has(key))
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
}

/**
 * Whether the derived tags plugin could change the output. It never misses a change: when in
 * doubt it says yes, and the plugin runs as it does without compiler mode.
 *
 * - The default `og:url` follows the canonical link. A canonical link from another entry
 *   changes it, unless another entry sets an `og:url` that wins.
 * - The `og:image:*` tags of an entry whose `og:image` lost are dropped. Without priorities, the
 *   last `og:image` wins, and a dropped tag changes nothing if a later entry replaces it.
 */
export function needsDerivedTags(entries: EntryInput[], { defaultCanonicalTags, ogUrlYields }: DerivedTagsContext): boolean {
  let otherCanonical = false
  let ownOgUrl = false
  const imageEntries: Record<string, any>[][] = []
  for (const entry of entries) {
    if (entry._tag === 'Loose') {
      if (mayHoldMetaOrLink(entry.input))
        return true
      continue
    }
    const meta = list(entry.input.meta)
    if (entry.compiledTags !== defaultCanonicalTags && list(entry.input.link).some(link => link.rel === 'canonical'))
      otherCanonical = true
    if (meta.some(tag => metaKey(tag) === 'og:url' && tag.key !== OG_URL_KEY && tag.tagPriority === undefined))
      ownOgUrl = true
    if (meta.some(isImageTag))
      imageEntries.push(meta)
  }
  if (otherCanonical && !(ogUrlYields && ownOgUrl))
    return true
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
export function absoluteImageEntries<T extends InternalEntry>(entries: Iterable<T>, resolve: (path: string) => string): [T, Record<string, any>][] | 'Plugin' {
  const rewrites: [T, Record<string, any>][] = []
  for (const entry of entries) {
    const [read] = readEntryInputs([entry])
    if (read!._tag === 'Loose') {
      if (mayHoldMetaOrLink(read!.input))
        return 'Plugin'
      continue
    }
    if (!holdsImageMeta(read!.input))
      continue
    // the `input` getter of a compiled server entry resolves its values
    const input = absoluteImageInput(entry.input as Record<string, any>, resolve)
    if (input === 'Plugin')
      return 'Plugin'
    if (input)
      rewrites.push([entry, input])
  }
  return rewrites
}
