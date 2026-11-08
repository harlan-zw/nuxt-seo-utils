import type { NuxtApp } from 'nuxt/app'
import type { CompiledHeadShape } from '../../shared/compiledHeadShapes'
import { toHeadInput } from 'unhead/compiled/compile'
import { acceptCompiledTags } from 'unhead/lazy'
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
  patch: (input: any, options?: { values?: unknown[] }) => void
}

/** Entry options other than values, such as `tagPriority`. */
export type EntryOptions = Record<string, unknown>

interface PushHead {
  _acceptsCompiled?: unknown
  blockLoad?: unknown
  push: (input: any, options?: EntryOptions & { values?: unknown[] | (() => unknown[]) }) => PatchableEntry
}

/**
 * Whether the head renders compiled tags: a compiled server head, or a lazy client head. A lazy
 * head takes them once `acceptCompiledTags` runs, as the first compiled head call does.
 */
export function acceptsCompiledTags(head: PushHead): boolean {
  if (!head._acceptsCompiled && head.blockLoad)
    acceptCompiledTags(head as any)
  return !!head._acceptsCompiled
}

// A head that cannot take compiled tags, such as one from @unhead/vue/server or @unhead/vue/client, takes the input they came from.
function toLoose(choice: HeadChoice): HeadChoice {
  return choice._tag === 'Compiled' ? { _tag: 'Loose', input: toHeadInput(choice.tags as any, choice.values) } : choice
}

/**
 * Pushes an entry whose content `choose` decides.
 *
 * On the server, `choose` runs once, when the app has rendered, as `useHead` resolves its
 * getters at the head render. Choices made then can still reach the payload. If the head
 * renders first, it runs at that render. On the client, an effect runs `choose` again when
 * what it reads changes, and patches the entry only when the choice changes.
 */
export function pushChosenHead(nuxtApp: NuxtApp, head: PushHead, chooseCompiled: () => HeadChoice, options?: EntryOptions): void {
  const accepts = acceptsCompiledTags(head)
  const choose = accepts ? chooseCompiled : () => toLoose(chooseCompiled())
  if (import.meta.server) {
    if (!accepts) {
      // That head resolves a getter input at the render
      head.push(() => (choose() as { input: object }).input, options)
      return
    }
    let values: unknown[] | undefined
    const settle = (): unknown[] => {
      if (!values) {
        const choice = choose()
        values = choice._tag === 'Compiled' ? choice.values : []
        if (choice._tag === 'Compiled')
          entry.patch(choice.tags, { values })
        else
          entry.patch(choice.input)
      }
      return values
    }
    // Empty compiled tags until the choice, so the entry renders nothing if nothing settles it.
    const entry = head.push([], { ...options, values: settle })
    nuxtApp.hooks.hook('app:rendered', () => {
      settle()
    })
    return
  }
  let entry: PatchableEntry | undefined
  let current: HeadChoice | undefined
  watchEffect(() => {
    const choice = choose()
    if (sameChoice(current, choice))
      return
    current = choice
    const [input, values] = choice._tag === 'Compiled' ? [choice.tags, { values: choice.values }] : [choice.input, undefined]
    if (entry)
      entry.patch(input, values)
    else
      entry = head.push(input, { ...options, ...values })
  })
}
