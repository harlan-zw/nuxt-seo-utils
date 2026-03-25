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
  let parenDepth = 0
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
    // track paren depth for calc()/min()/max()/clamp()/var()
    else if (ch === '(') {
      parenDepth++
      result += ch
      i++
    }
    else if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1)
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
      if (parenDepth > 0) {
        // inside parens (calc/min/max/clamp/var): strip around * and / (safe per spec),
        // preserve around + and - (required by spec), strip around base punctuation
        if (prev && next && !isCSSCalcPunctuation(prev) && !isCSSCalcPunctuation(next))
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
    else if (ch === '0' && code[i + 1] === '.' && code[i + 2] >= '0' && code[i + 2] <= '9') {
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
  // inside parens: strip spaces around base punctuation and * /
  // but NOT + and - (CSS spec requires spaces around them in calc)
  return isCSSBasePunctuation(ch) || ch === '*' || ch === '/'
}

/**
 * Minify JSON by stripping whitespace via parse/stringify round-trip.
 */
export function minifyJSON(code: string): string {
  return JSON.stringify(JSON.parse(code))
}
