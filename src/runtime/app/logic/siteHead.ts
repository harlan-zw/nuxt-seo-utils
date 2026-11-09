import type { EntryPriority, HeadChoice } from './compiledHead'
import { compileTags } from 'unhead/compiled'

/**
 * Site config head input, such as template params, cannot hold dynamic values. So the server
 * compiles each distinct input once, and the payload carries the compiled tags to the client,
 * which has no compiler. Each payload record holds a hash of the input that made it.
 */
export type SiteHeadPayload = Record<string, [hash: string, tags: unknown]>

// Site config rarely changes between requests: a site has one input per locale. Past this
// many inputs, an input stays normal input instead of growing the cache.
const MAX_COMPILED_INPUTS = 256
const compiledInputs = new Map<string, unknown>()

/** FNV-1a. It only tells the client whether its input is the one the server compiled. */
export function hashInput(json: string): string {
  let hash = 0x811C9DC5
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

/**
 * Compiles input once per distinct JSON and priority. Returns `undefined` when it cannot
 * compile, or when the cache is full. The same compiled tags return for the same input, so the
 * server head memo sees one set of compiled tags per input. Each tag holds `tagPriority`, so
 * the entry needs no options.
 */
export function compileSiteInput(json: string, input: object, tagPriority?: EntryPriority): unknown {
  const key = tagPriority === undefined ? json : `${tagPriority}\u0000${json}`
  let tags = compiledInputs.get(key)
  if (tags === undefined) {
    if (compiledInputs.size >= MAX_COMPILED_INPUTS)
      return undefined
    const result = compileTags(input, { tagPriority })
    tags = result._tag === 'Ok' ? result.tags : false
    compiledInputs.set(key, tags)
  }
  return tags || undefined
}

/** The server choice: compiled tags, recorded in the payload, or the input. */
export function chooseServerSiteHead(payload: SiteHeadPayload, id: string, input: object, tagPriority?: EntryPriority): HeadChoice {
  const json = JSON.stringify(input)
  const tags = compileSiteInput(json, input, tagPriority)
  if (tags === undefined)
    return { _tag: 'Loose', input }
  payload[id] = [hashInput(json), tags]
  return { _tag: 'Compiled', tags, values: [] }
}

/**
 * The client choice: the compiled tags the server made from the same input, or the input.
 * Input that differs, such as site config after a client side locale change, stays normal input.
 */
export function chooseClientSiteHead(payload: SiteHeadPayload, id: string, input: object): HeadChoice {
  const record = payload[id]
  return record && record[0] === hashInput(JSON.stringify(input))
    ? { _tag: 'Compiled', tags: record[1], values: [] }
    : { _tag: 'Loose', input }
}
