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

  it('preserves newlines for ASI safety', () => {
    const input = 'const a = 1\nconst b = 2'
    expect(minifyJS(input)).toBe('const a=1\nconst b=2')
  })

  it('removes newlines after opening braces', () => {
    expect(minifyJS('if (x) {\n  y()\n}')).toBe('if(x){y()}')
  })

  it('removes newlines before closing braces', () => {
    expect(minifyJS('function f() {\n  return 1\n}')).toBe('function f(){return 1}')
  })

  it('removes newlines after semicolons', () => {
    expect(minifyJS('a = 1;\nb = 2;')).toBe('a=1;b=2;')
  })

  it('handles function declarations', () => {
    const input = `
      function hello(name) {
        console.log("Hello " + name)
      }
    `
    const result = minifyJS(input)
    expect(result).toBe('function hello(name){console.log("Hello "+name)}')
  })

  it('handles arrow functions', () => {
    expect(minifyJS('const fn = (x) => { return x * 2 }')).toBe('const fn=(x)=>{return x*2}')
  })

  it('handles ternary operators', () => {
    expect(minifyJS('const x = a ? b : c')).toBe('const x=a?b:c')
  })

  it('handles object literals', () => {
    const input = `const obj = {
      key: "value",
      num: 42
    }`
    const result = minifyJS(input)
    expect(result).toContain('key:"value"')
    expect(result).toContain('num:42')
  })

  it('handles array access and chaining', () => {
    expect(minifyJS('arr[0].toString()')).toBe('arr[0].toString()')
  })

  it('handles comments between statements', () => {
    const input = `
      const a = 1
      // this is a comment
      const b = 2
      /* another comment */
      const c = 3
    `
    const result = minifyJS(input)
    expect(result).not.toContain('comment')
    expect(result).toContain('const a=1')
    expect(result).toContain('const b=2')
    expect(result).toContain('const c=3')
  })

  it('handles strings containing comment-like patterns', () => {
    expect(minifyJS('const x = "// not a comment"')).toBe('const x="// not a comment"')
    expect(minifyJS('const x = "/* not a comment */"')).toBe('const x="/* not a comment */"')
  })

  it('handles strings containing newlines (escaped)', () => {
    expect(minifyJS('const x = "line1\\nline2"')).toBe('const x="line1\\nline2"')
  })

  it('handles consecutive operators', () => {
    expect(minifyJS('x !== y')).toBe('x!==y')
    expect(minifyJS('x === y')).toBe('x===y')
    expect(minifyJS('x >= y')).toBe('x>=y')
  })

  it('handles real-world IIFE pattern', () => {
    const input = `
      (function() {
        var x = document.getElementById("app")
        x.style.display = "block"
      })()
    `
    const result = minifyJS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('var x=document.getElementById("app")')
  })

  it('handles window assignment patterns', () => {
    const input = 'window.__NUXT__ = { serverRendered: true, config: { public: {} } }'
    const result = minifyJS(input)
    expect(result).toBe('window.__NUXT__={serverRendered:true,config:{public:{}}}')
  })

  it('handles import statements', () => {
    const input = 'import p from "/_payload.js"; window.__NUXT__ = { ...p }'
    const result = minifyJS(input)
    expect(result).toBe('import p from"/_payload.js";window.__NUXT__={...p}')
  })

  it('preserves regex-like division', () => {
    expect(minifyJS('const x = a / b')).toBe('const x=a/b')
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

  it('handles media queries', () => {
    const input = `
      @media (max-width: 768px) {
        .container {
          padding: 0;
        }
      }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('@media')
    expect(result).toContain('max-width')
  })

  it('handles CSS variables', () => {
    const input = ':root { --color-primary: #333; --spacing: 8px; }'
    const result = minifyCSS(input)
    expect(result).toBe(':root{--color-primary:#333;--spacing:8px;}')
  })

  it('handles pseudo-selectors', () => {
    expect(minifyCSS('a:hover { color: blue }')).toBe('a:hover{color:blue}')
    expect(minifyCSS('a::before { content: "" }')).toBe('a::before{content:""}')
  })

  it('handles multiple rules', () => {
    const input = `
      h1 { font-size: 2rem; }
      h2 { font-size: 1.5rem; }
      p { line-height: 1.6; }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('\n')
    expect(result).toContain('h1{')
    expect(result).toContain('h2{')
    expect(result).toContain('p{')
  })

  it('handles nested comments', () => {
    const input = '/* outer /* inner */ still comment */ body { color: red }'
    // CSS comments don't nest, so everything up to first */ is removed
    const result = minifyCSS(input)
    expect(result).toContain('body{color:red}')
  })

  it('handles keyframes', () => {
    const input = `
      @keyframes fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('@keyframes')
    expect(result).toContain('opacity')
  })

  it('preserves single-quoted strings', () => {
    expect(minifyCSS('body::after { content: \'hello   world\' }')).toBe('body::after{content:\'hello   world\'}')
  })

  it('handles calc expressions', () => {
    expect(minifyCSS('.x { width: calc(100% - 20px) }')).toBe('.x{width:calc(100% - 20px)}')
  })

  it('handles child and sibling combinators', () => {
    expect(minifyCSS('.a  +  .b  ~  .c { color: red }')).toBe('.a+.b~.c{color:red}')
  })
})
