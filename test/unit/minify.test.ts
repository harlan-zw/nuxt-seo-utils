import { describe, expect, it } from 'vitest'
import { minifyCSS, minifyJS } from '../../src/runtime/shared/minify'

describe('minifyJS', () => {
  it('collapses whitespace', () => {
    expect(minifyJS('const  x  =  1')).toBe('const x=1')
  })

  it('removes single-line comments', () => {
    expect(minifyJS('const x = 1 // comment\nconst y = 2')).toBe('const x=1\nconst y=2')
  })

  it('removes multi-line comments', () => {
    expect(minifyJS('const x = /* comment */ 1')).toBe('const x=1')
  })

  it('preserves string literals', () => {
    expect(minifyJS('const x = "hello   world"')).toBe('const x="hello   world"')
  })

  it('preserves single-quoted strings', () => {
    expect(minifyJS('const x = \'hello   world\'')).toBe('const x=\'hello   world\'')
  })

  it('preserves template literals', () => {
    expect(minifyJS('const x = `hello   world`')).toBe('const x=`hello   world`')
  })

  it('preserves escaped quotes in strings', () => {
    expect(minifyJS('const x = "hello \\"world\\""')).toBe('const x="hello \\"world\\""')
  })

  it('preserves spaces between identifiers', () => {
    expect(minifyJS('return true')).toBe('return true')
    expect(minifyJS('var foo = bar')).toBe('var foo=bar')
    expect(minifyJS('typeof window')).toBe('typeof window')
  })

  it('removes spaces around operators', () => {
    expect(minifyJS('x + y')).toBe('x+y')
    expect(minifyJS('x = y')).toBe('x=y')
    expect(minifyJS('a && b')).toBe('a&&b')
  })

  it('handles multiline code', () => {
    const input = `
      const a = 1
      const b = 2
      const c = a + b
    `
    expect(minifyJS(input)).toBe('const a=1\nconst b=2\nconst c=a+b')
  })

  it('handles real-world Nuxt hydration-like payload', () => {
    const input = `
      window.__NUXT__ = {
        data: {},
        state: {
          key: "value"
        }
      }
    `
    const result = minifyJS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('window.__NUXT__')
    expect(result).toContain('"value"')
  })

  it('returns empty string for empty input', () => {
    expect(minifyJS('')).toBe('')
    expect(minifyJS('   ')).toBe('')
  })
})

describe('minifyCSS', () => {
  it('collapses whitespace', () => {
    expect(minifyCSS('body  {  color:  red  }')).toBe('body{color:red}')
  })

  it('removes comments', () => {
    expect(minifyCSS('/* comment */ body { color: red }')).toBe('body{color:red}')
  })

  it('preserves string literals', () => {
    expect(minifyCSS('body::after { content: "hello   world" }')).toBe('body::after{content:"hello   world"}')
  })

  it('removes whitespace around selectors', () => {
    expect(minifyCSS('.a  >  .b  {  margin:  0  }')).toBe('.a>.b{margin:0}')
  })

  it('handles multiline CSS', () => {
    const input = `
      .container {
        display: flex;
        align-items: center;
      }
    `
    expect(minifyCSS(input)).toBe('.container{display:flex;align-items:center;}')
  })

  it('handles multiple selectors', () => {
    expect(minifyCSS('h1, h2, h3 { font-weight: bold }')).toBe('h1,h2,h3{font-weight:bold}')
  })

  it('returns empty string for empty input', () => {
    expect(minifyCSS('')).toBe('')
    expect(minifyCSS('   ')).toBe('')
  })
})
