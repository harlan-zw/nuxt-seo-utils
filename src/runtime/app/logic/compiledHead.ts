import type { NuxtApp } from 'nuxt/app'
import type { CompiledHeadShape } from '../../shared/compiledHeadShapes'
import { watchEffect } from 'vue'
import { isText, specialValue } from '../../shared/compiledHeadShapes'

/** What an entry holds: compiled tags with their values, or normal input. */
export type HeadChoice
  = | { _tag: 'Compiled', tags: unknown, values: unknown[] }
    | { _tag: 'Loose', input: object }

/**
 * Picks the compiled tags of a shape for these values. A value that compiled tags render
 * differently, such as an empty string, takes the normal input that `loose` builds, so the
 * output stays the same as without compiler mode.
 */
export function chooseShape(shape: CompiledHeadShape | undefined, values: unknown[], loose: () => object): HeadChoice {
  if (shape) {
    if (values.every(isText))
      return { _tag: 'Compiled', tags: shape.tags, values }
    const special = values.length === 1 ? specialValue(values[0]) : undefined
    const tags = special && shape.special[special]
    if (tags)
      return { _tag: 'Compiled', tags, values: [] }
  }
  return { _tag: 'Loose', input: loose() }
}

function sameChoice(a: HeadChoice | undefined, b: HeadChoice): boolean {
  if (!a || a._tag !== b._tag)
    return false
  return a._tag === 'Compiled' && b._tag === 'Compiled'
    ? a.tags === b.tags && a.values.length === b.values.length && a.values.every((value, i) => value === b.values[i])
    : JSON.stringify((a as { input: object }).input) === JSON.stringify((b as { input: object }).input)
}

interface PatchableEntry {
  patch: (input: any, options?: { values?: unknown[], tagPriority?: EntryPriority }) => void
  dispose: () => void
}

/** The `tagPriority` that `compileTags` can hold in each tag. */
export type EntryPriority = number | 'critical' | 'high' | 'low'

interface PushHead {
  push: (input: any, options?: { values?: unknown[] | (() => unknown[]), tagPriority?: EntryPriority, seoMeta?: true }) => PatchableEntry
}

export interface PushChosenOptions {
  /** The entry stands for a `useSeoMeta` call without compiler mode, so `readEntry` reports `seoMeta`. */
  seoMeta?: true
  /**
   * The priority of every tag of the entry. A compiled choice holds it in its tags, from the
   * `tagPriority` option of `compileTags`, so the server entry takes no options and keeps the
   * memo. Normal input takes it as the entry option.
   */
  tagPriority?: EntryPriority
}

/**
 * Pushes an entry whose content `choose` decides.
 *
 * The module adds the plugins that call it only under compiler mode, which the build knows, so
 * the head is a compiled server head or a lazy client head, and both take compiled tags.
 *
 * On the server, `choose` runs once, when the app has rendered, as `useHead` resolves its
 * getters at the head render. Choices made then can still reach the payload. If the head
 * renders or a reader reads the entry first, it runs then. On the client, an effect runs
 * `choose` again when what it reads changes, and patches the entry only when the choice changes.
 */
export function pushChosenHead(nuxtApp: NuxtApp, head: PushHead, choose: () => HeadChoice, options: PushChosenOptions = {}): void {
  if (import.meta.server)
    pushServerChosenHead(nuxtApp, head, choose, options)
  else
    pushClientChosenHead(head, choose, options)
}

/** `pushChosenHead` on the server: one choice, made when the app has rendered or when the entry is first read. */
export function pushServerChosenHead(nuxtApp: Pick<NuxtApp, 'hooks'>, head: PushHead, choose: () => HeadChoice, { seoMeta, tagPriority }: PushChosenOptions = {}): void {
  const marks = seoMeta ? { seoMeta } : {}
  let values: unknown[] | undefined
  const apply = (choice: HeadChoice): void => {
    values = choice._tag === 'Compiled' ? choice.values : []
    if (choice._tag === 'Compiled') {
      entry.patch(choice.tags, { values })
    }
    else if (tagPriority === undefined) {
      entry.patch(choice.input)
    }
    else {
      // A patch cannot add the entry option, so normal input with a priority takes a new
      // entry. Its tags sort by their priority first, so only entries of the same priority
      // see the new place.
      entry.dispose()
      entry = head.push(choice.input, { tagPriority, ...marks })
    }
  }
  const settle = (): unknown[] => {
    if (!values)
      apply(choose())
    return values!
  }
  // Empty compiled tags until the choice, so the entry renders nothing if nothing settles it.
  let entry = head.push([], { values: settle, ...marks })
  nuxtApp.hooks.hook('app:rendered', () => {
    settle()
  })
}

/** `pushChosenHead` on the client: an effect patches the entry when the choice changes. */
export function pushClientChosenHead(head: PushHead, choose: () => HeadChoice, { seoMeta, tagPriority }: PushChosenOptions = {}): void {
  const marks = seoMeta ? { seoMeta } : {}
  const looseOptions = tagPriority === undefined ? {} : { tagPriority }
  let entry: PatchableEntry | undefined
  let current: HeadChoice | undefined
  watchEffect(() => {
    const choice = choose()
    if (sameChoice(current, choice))
      return
    current = choice
    // The client has no server memo, so an entry option costs nothing there.
    const [input, options] = choice._tag === 'Compiled' ? [choice.tags, { values: choice.values, ...looseOptions }] : [choice.input, looseOptions]
    if (entry) {
      entry.patch(input, options)
    }
    else {
      entry = head.push(input, { ...options, ...marks })
    }
  })
}
