/**
 * Lightweight JS minifier in pure JS (no native deps).
 * Strips comments and collapses whitespace while preserving string literals.
 */
export function minifyJS(code: string): string {
  let result = ''
  let i = 0
  const len = code.length

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"' || ch === '`') {
      const quote = ch
      result += ch
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\') {
          result += code[i++]
        }
        result += code[i++]
      }
      if (i < len)
        result += code[i++] // closing quote
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
      const prev = result.at(-1)
      const next = code[i]
      if (hasNewline && prev && next && prev !== '{' && prev !== '}' && prev !== ';' && next !== '}' && next !== ';')
        result += '\n'
      else if (prev && next && isIdentChar(prev) && isIdentChar(next))
        result += ' '
      // preserve space between identical + or - to avoid creating ++/-- operators
      else if (prev && next && ((prev === '+' && next === '+') || (prev === '-' && next === '-')))
        result += ' '
    }
    else {
      result += ch
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
  let result = ''
  let i = 0
  // Stack of paren contexts: true = selector-function paren (:is/:where/:not/:has),
  // false = value paren (calc/min/max/clamp/var/rgb…). Whitespace rules differ:
  // value parens may strip spaces around * and /, selector parens must not (the
  // space before * is the descendant combinator, e.g. Tailwind v4 group-* variants).
  const parenStack: boolean[] = []
  const len = code.length

  while (i < len) {
    const ch = code[i]
    // string literals - preserve as-is
    if (ch === '\'' || ch === '"') {
      const quote = ch
      result += ch
      i++
      while (i < len && code[i] !== quote) {
        if (code[i] === '\\')
          result += code[i++]
        result += code[i++]
      }
      if (i < len)
        result += code[i++]
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
      parenStack.push(isSelectorFunctionParen(result))
      result += ch
      i++
    }
    else if (ch === ')') {
      parenStack.pop()
      result += ch
      i++
    }
    // whitespace - collapse to single space, remove around punctuation
    else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      while (i < len && (code[i] === ' ' || code[i] === '\t' || code[i] === '\n' || code[i] === '\r'))
        i++
      const prev = result.at(-1)
      const next = code[i]
      // strip space before ! for !important
      if (next === '!')
        continue
      if (parenStack.length > 0) {
        // selector parens (:is/:where/:not/:has) follow selector whitespace rules so
        // the descendant combinator before * is preserved; value parens (calc/min/…)
        // may additionally strip around * and / (safe per spec), preserving + and -.
        const isPunct = parenStack[parenStack.length - 1] ? isCSSPunctuation : isCSSCalcPunctuation
        if (prev && next && !isPunct(prev) && !isPunct(next))
          result += ' '
      }
      else if (prev && next && !isCSSPunctuation(prev) && !isCSSPunctuation(next)) {
        result += ' '
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
        result += ch
        i++
      }
    }
    // leading zero: 0.x → .x
    else if (ch === '0' && code[i + 1] === '.' && (code[i + 2] ?? '') >= '0' && (code[i + 2] ?? '') <= '9') {
      const prev = result.at(-1)
      // only strip if prev is not a digit (avoid turning 10.5 into 1.5)
      if (prev && prev >= '0' && prev <= '9') {
        result += ch
        i++
      }
      else {
        i++ // skip the 0, the . will be picked up next iteration
      }
    }
    else {
      result += ch
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
function isSelectorFunctionParen(result: string): boolean {
  let j = result.length - 1
  while (j >= 0 && isCSSNameChar(result[j]!))
    j--
  if (result[j] !== ':')
    return false
  const name = result.slice(j + 1).toLowerCase()
  return name === 'is' || name === 'where' || name === 'not' || name === 'has'
    || name === 'matches' || name === 'host' || name === 'host-context' || name === 'slotted'
}

/**
 * Minify JSON by stripping whitespace via parse/stringify round-trip.
 */
export function minifyJSON(code: string): string {
  return JSON.stringify(JSON.parse(code))
}
