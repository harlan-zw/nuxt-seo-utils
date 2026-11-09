/**
 * Sets the content of the default `og:url` of a server head, after the app has rendered. The
 * derived tags plugin under compiler mode calls it in place of a render hook. Each head is one
 * request, and the map holds it weakly.
 */
export type SetOgUrl = (content: string | false) => void

const ogUrlSetters = new WeakMap<object, SetOgUrl>()

export function provideOgUrlSetter(head: object, set: SetOgUrl): void {
  ogUrlSetters.set(head, set)
}

export function ogUrlSetter(head: object): SetOgUrl | undefined {
  return ogUrlSetters.get(head)
}

const defaultCanonicals = new WeakMap<object, () => object | undefined>()

/**
 * Records the entry of the default canonical link of a head. Its href never moves the default
 * `og:url`, which takes the same href.
 */
export function provideDefaultCanonical(head: object, entry: () => object | undefined): void {
  defaultCanonicals.set(head, entry)
}

export function defaultCanonicalEntry(head: object): object | undefined {
  return defaultCanonicals.get(head)?.()
}
