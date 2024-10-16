import type { NuxtPage } from '@nuxt/schema'
import escapeRE from 'escape-string-regexp'
import { extname, relative } from 'pathe'
import { encodePath } from 'ufo'

// copied from nuxt/src/pages/utils.ts

enum SegmentParserState {
  initial,
  static,
  dynamic,
  optional,
  catchall,
}

enum SegmentTokenType {
  static,
  dynamic,
  optional,
  catchall,
}

interface SegmentToken {
  type: SegmentTokenType
  value: string
}

// @todo @nuxt/kit util?
export function generateNuxtPageFromFile(file: string, pagesDir: string): NuxtPage {
  const segments = relative(pagesDir, file)
    .replace(new RegExp(`${escapeRE(extname(file))}$`), '')
    .split('/')

  const route: NuxtPage = {
    name: '',
    path: '',
    file,
    children: [],
  }

  // Array where routes should be added, useful when adding child routes
  let parent: NuxtPage[] = []

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]

    const tokens = parseSegment(segment)
    const segmentName = tokens.map(({ value }) => value).join('')

    // ex: parent/[slug].vue -> parent-slug
    route.name += (route.name && '-') + segmentName

    // ex: parent.vue + parent/child.vue
    const child = parent.find(parentRoute => parentRoute.name === route.name && !parentRoute.path.endsWith('(.*)*'))

    if (child && child.children) {
      parent = child.children
      route.path = ''
    }
    else if (segmentName === 'index' && !route.path) {
      route.path += '/'
    }
    else if (segmentName !== 'index') {
      route.path += getRoutePath(tokens)
    }
  }

  // Remove -index
  if (route.name)
    route.name = route.name.replace(/-index$/, '')

  return route
}

function getRoutePath(tokens: SegmentToken[]): string {
  return tokens.reduce((path, token) => {
    return (
      path
      + (token.type === SegmentTokenType.optional
        ? `:${token.value}?`
        : token.type === SegmentTokenType.dynamic
          ? `:${token.value}`
          : token.type === SegmentTokenType.catchall
            ? `:${token.value}(.*)*`
            : encodePath(token.value))
    )
  }, '/')
}

const PARAM_CHAR_RE = /[\w.]/

function parseSegment(segment: string) {
  let state: SegmentParserState = SegmentParserState.initial
  let i = 0

  let buffer = ''
  const tokens: SegmentToken[] = []

  function consumeBuffer() {
    if (!buffer)
      return

    if (state === SegmentParserState.initial)
      throw new Error('wrong state')

    tokens.push({
      type:
        state === SegmentParserState.static
          ? SegmentTokenType.static
          : state === SegmentParserState.dynamic
            ? SegmentTokenType.dynamic
            : state === SegmentParserState.optional
              ? SegmentTokenType.optional
              : SegmentTokenType.catchall,
      value: buffer,
    })

    buffer = ''
  }

  while (i < segment.length) {
    const c = segment[i]

    switch (state) {
      case SegmentParserState.initial:
        buffer = ''
        if (c === '[') {
          state = SegmentParserState.dynamic
        }
        else {
          i--
          state = SegmentParserState.static
        }
        break

      case SegmentParserState.static:
        if (c === '[') {
          consumeBuffer()
          state = SegmentParserState.dynamic
        }
        else {
          buffer += c
        }
        break

      case SegmentParserState.catchall:
      case SegmentParserState.dynamic:
      case SegmentParserState.optional:
        if (buffer === '...') {
          buffer = ''
          state = SegmentParserState.catchall
        }
        if (c === '[' && state === SegmentParserState.dynamic)
          state = SegmentParserState.optional

        if (c === ']' && (state !== SegmentParserState.optional || buffer[buffer.length - 1] === ']')) {
          if (!buffer)
            throw new Error('Empty param')
          else
            consumeBuffer()

          state = SegmentParserState.initial
        }
        else if (PARAM_CHAR_RE.test(c)) {
          buffer += c
        }
        else {

          // console.debug(`[pages]Ignored character "${c}" while building param "${buffer}" from "segment"`)
        }
        break
    }
    i++
  }

  if (state === SegmentParserState.dynamic)
    throw new Error(`Unfinished param "${buffer}"`)

  consumeBuffer()

  return tokens
}
