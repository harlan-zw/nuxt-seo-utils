export const JSON_TYPES = new Set(['application/json', 'application/ld+json'])
export const SKIP_JS_TYPES = new Set(['application/json', 'application/ld+json', 'speculationrules', 'importmap'])

const JS_MINIFY_CANDIDATE_RE = /[\s/]/
const CSS_MINIFY_CANDIDATE_RE = /[\s/]|;\}|0\.\d/

/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyJS(code: string): string {
  if (!JS_MINIFY_CANDIDATE_RE.test(code))
    return code

  let result = ''
  let last = ''
  let i = 0
  const len = code.length
  // Reading from the growing result forces V8 to flatten its string rope.
  const append = (value: string) => {
    result += value
    last = value
  }

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      append(ch)
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') {
          append(code[i++]!)
        }
        append(code[i++]!)
      }
      if (i < len)
        append(code[i++]!) // closing quote
    }
    // single-line comment
    else if (ch === '/' && code[i + 1] === '/') {
      i += 2
      while (i < len && code[i] !== '\n')
        i++
    }
    // multi-line comment
    else if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < len && !(code[i] === '*' && code[i + 1] === '/'))
        i++
      i += 2
    }
    // whitespace - collapse, preserving newlines for ASI safety
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      let hasNewline = false
      while (i < len && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r')) {
        if (code[i] === '\n')
          hasNewline = true
        i++
      }
      const next = code[i]
      if (hasNewline && last && next && last !== '{' && last !== '}' && last !== ';' && next !== '}' && next !== ';')
        append('\n')
      else if (last && next && isIdentChar(last) && isIdentChar(next))
        append(' ')
      // preserve space between identical + or - to avoid creating ++/-- operators
      else if (last && next && ((last === '+' && next === '+') || (last === '-' && next === '-')))
        append(' ')
    }
    else {
      append(ch!)
      i++
    }
  }

  return result.trim()
}

/**
 * Lightweight CSS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyCSS(code: string): string {
  if (!CSS_MINIFY_CANDIDATE_RE.test(code))
    return code

  let result = ''
  let last = ''
  let i = 0
  // Stack of paren contexts: true = selector-function paren (:is/:where/:not/:has),
  // false = value paren (calc/min/max/clamp/var/rgb…). Whitespace rules differ:
  // value parens may strip spaces around * and /, selector parens must not (the
  // space before * is the descendant combinator, e.g. Tailwind v4 group-* variants).
  const parenStack: boolean[] = []
  const len = code.length
  // Reading from the growing result forces V8 to flatten its string rope.
  const append = (value: string) => {
    result += value
    last = value
  }

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"') {
      const quote = ch
      append(ch)
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\')
          append(code[i++]!)
        append(code[i++]!)
      }
      if (i < len)
        append(code[i++]!)
    }
    // comments
    else if (ch === '/' && code[i + 1] === '*') {
      i += 2
      while (i < len && !(code[i] === '*' && code[i + 1] === '/'))
        i++
      i += 2
    }
    // track paren context for calc()/min()/max()/clamp()/var() vs :is()/:where()/…
    else if (ch === '(') {
      parenStack.push(isSelectorFunctionParen(code, i))
      append(ch)
      i++
    }
    else if (ch === ')') {
      parenStack.pop()
      append(ch)
      i++
    }
    // whitespace - collapse to single space, remove around punctuation
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      while (i < len && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r'))
        i++
      const next = code[i]
      // strip space before ! for !important
      if (next === '!')
        continue
      if (parenStack.length > 0) {
        // selector parens (:is/:where/:not/:has) follow selector whitespace rules so
        // the descendant combinator before * is preserved; value parens (calc/min/…)
        // may additionally strip around * and / (safe per spec), preserving + and -.
        const isPunct = parenStack[parenStack.length - 1] ? isCSSPunctuation : isCSSCalcPunctuation
        if (last && next && !isPunct(last) && !isPunct(next))
          append(' ')
      }
      else if (last && next && !isCSSPunctuation(last) && !isCSSPunctuation(next)) {
        append(' ')
      }
    }
    // trailing semicolon before } is optional
    else if (ch === ';') {
      let j = i + 1
      while (j < len && (code[j] === ' ' || code[j] === '\t' || code[j] === '\n' || code[j] === '\r'))
        j++
      if (code[j] === '}') {
        i++ // skip the semicolon
      }
      else {
        append(ch)
        i++
      }
    }
    // leading zero: 0.x → .x
    else if (ch === '0' && code[i + 1] === '.' && (code[i + 2] ?? '') >= '0' && (code[i + 2] ?? '') <= '9') {
      // only strip if prev is not a digit (avoid turning 10.5 into 1.5)
      if (last && last >= '0' && last <= '9') {
        append(ch)
        i++
      }
      else {
        i++ // skip the 0, the . will be picked up next iteration
      }
    }
    else {
      append(ch!)
      i++
    }
  }

  return result.trim()
}

function isIdentChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z')
    || (ch >= 'A' && ch <= 'Z')
    || (ch >= '0' && ch <= '9')
    || ch === '_' || ch === '$'
}

function isCSSBasePunctuation(ch: string): boolean {
  return ch === '{' || ch === '}' || ch === ';' || ch === ':' || ch === ','
}

function isCSSPunctuation(ch: string): boolean {
  return isCSSBasePunctuation(ch) || ch === '>' || ch === '+' || ch === '~'
}

function isCSSCalcPunctuation(ch: string): boolean {
  // inside value parens: strip spaces around base punctuation and * /
  // but NOT + and - (CSS spec requires spaces around them in calc)
  return isCSSBasePunctuation(ch) || ch === '*' || ch === '/'
}

function isCSSNameChar(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '-'
}

// A '(' opens a selector-function paren when it directly follows a functional
// pseudo-class/element (:is, :where, :not, :has, …). Inside those, * is the
// universal selector and the leading space is the descendant combinator, so the
// calc-style stripping of * / must not apply (e.g. Tailwind v4 group-* variants).
function isSelectorFunctionParen(code: string, parenIndex: number): boolean {
  let j = parenIndex - 1
  while (j >= 0 && isCSSNameChar(code[j]!))
    j--
  if (code[j] !== ':')
    return false
  const name = code.slice(j + 1, parenIndex).toLowerCase()
  return name === 'is' || name === 'where' || name === 'not' || name === 'has'
    || name === 'matches' || name === 'host' || name === 'host-context' || name === 'slotted'
}

/**
 * Minify JSON by stripping whitespace via parse/stringify round-trip.
 */
export function minifyJSON(code: string): string {
  return JSON.stringify(JSON.parse(code))
}
