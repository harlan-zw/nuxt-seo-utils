import { describe, expect, it } from 'vitest'
import { minifyCSS, minifyJSON } from '../../src/runtime/shared/minify'

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
    expect(minifyCSS(input)).toBe('.container{display:flex;align-items:center}')
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
    expect(result).toBe(':root{--color-primary:#333;--spacing:8px}')
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

  // --- calc() edge cases ---

  it('preserves spaces inside nested calc', () => {
    expect(minifyCSS('.x { width: calc(100% - calc(2 * 10px)) }')).toBe('.x{width:calc(100% - calc(2*10px))}')
  })

  // CSSO-inspired calc tests (from csso/fixtures/compress/calc.css)
  it('handles CSSO calc patterns', () => {
    expect(minifyCSS('a { width: calc(20px + 5%) }')).toBe('a{width:calc(20px + 5%)}')
    expect(minifyCSS('a { height: calc((20px + 3em) - (20% - 5px)) }')).toBe('a{height:calc((20px + 3em) - (20% - 5px))}')
    expect(minifyCSS('a { margin: calc((20px * 3) + (20px / 4)) }')).toBe('a{margin:calc((20px*3) + (20px/4))}')
    expect(minifyCSS('a { padding: calc(20px / 5 + 3 * 5%) }')).toBe('a{padding:calc(20px/5 + 3*5%)}')
  })

  it('preserves spaces around + and - in calc', () => {
    // CSS spec requires spaces around + and - in calc()
    expect(minifyCSS('.x { margin: calc(1rem + 2px) }')).toBe('.x{margin:calc(1rem + 2px)}')
    expect(minifyCSS('.x { margin: calc(1rem - 2px) }')).toBe('.x{margin:calc(1rem - 2px)}')
  })

  it('strips spaces around * and / in calc (safe per CSS spec)', () => {
    expect(minifyCSS('.x { width: calc(100% * 0.5) }')).toBe('.x{width:calc(100%*.5)}')
    expect(minifyCSS('.x { width: calc(100px / 2) }')).toBe('.x{width:calc(100px/2)}')
  })

  it('handles calc in shorthand properties', () => {
    expect(minifyCSS('.x { padding: calc(1rem + 2px) calc(2rem - 4px) }')).toBe('.x{padding:calc(1rem + 2px) calc(2rem - 4px)}')
  })

  // CSSO-inspired: var() inside calc()
  it('handles var() inside calc()', () => {
    expect(minifyCSS('.x { --one: calc(var(--two) + 20px) }')).toBe('.x{--one:calc(var(--two) + 20px)}')
    expect(minifyCSS('.x { --bar: calc(var(--foo) + 10px) }')).toBe('.x{--bar:calc(var(--foo) + 10px)}')
  })

  it('handles min/max/clamp functions', () => {
    // comma is CSS punctuation so spaces around it are stripped
    expect(minifyCSS('.x { width: min(100%, 600px) }')).toBe('.x{width:min(100%,600px)}')
    expect(minifyCSS('.x { width: max(50%, 300px) }')).toBe('.x{width:max(50%,300px)}')
    expect(minifyCSS('.x { font-size: clamp(1rem, 2vw, 3rem) }')).toBe('.x{font-size:clamp(1rem,2vw,3rem)}')
  })

  it('handles calc inside clamp', () => {
    expect(minifyCSS('.x { width: clamp(200px, calc(50% - 20px), 800px) }')).toBe('.x{width:clamp(200px,calc(50% - 20px),800px)}')
  })

  it('handles calc with mixed operators', () => {
    // + and - preserve spaces, * and / strip spaces
    expect(minifyCSS('.x { width: calc(100% - 2 * 20px) }')).toBe('.x{width:calc(100% - 2*20px)}')
    expect(minifyCSS('.x { width: calc(100% / 3 + 10px) }')).toBe('.x{width:calc(100%/3 + 10px)}')
  })

  // --- Comment edge cases ---

  it('handles comment-only input', () => {
    expect(minifyCSS('/* nothing here */')).toBe('')
  })

  it('handles multiple consecutive comments', () => {
    expect(minifyCSS('/* a */ /* b */ .x { color: red }')).toBe('.x{color:red}')
  })

  it('handles comment between property and value', () => {
    expect(minifyCSS('.x { color: /* pick one */ red }')).toBe('.x{color:red}')
  })

  it('handles comment inside selector', () => {
    // comment removal leaves two whitespace runs that each collapse to a space
    expect(minifyCSS('.a /* comment */ .b { color: red }')).toBe('.a  .b{color:red}')
  })

  // --- String edge cases ---

  it('preserves url() with quotes', () => {
    expect(minifyCSS('.x { background: url("image.png") }')).toBe('.x{background:url("image.png")}')
  })

  it('preserves strings with escaped quotes', () => {
    expect(minifyCSS('.x::after { content: "say \\"hello\\"" }')).toBe('.x::after{content:"say \\"hello\\""}')
  })

  it('preserves content with special chars', () => {
    expect(minifyCSS('.x::before { content: "\\2022" }')).toBe('.x::before{content:"\\2022"}')
  })

  // --- Selector edge cases ---

  it('handles attribute selectors', () => {
    expect(minifyCSS('[data-theme="dark"] { color: white }')).toBe('[data-theme="dark"]{color:white}')
  })

  it('handles complex attribute selectors', () => {
    expect(minifyCSS('input[type="text"]:focus { border: 1px solid blue }')).toBe('input[type="text"]:focus{border:1px solid blue}')
  })

  it('handles :not() selector', () => {
    expect(minifyCSS('.x:not(:last-child) { margin-bottom: 1rem }')).toBe('.x:not(:last-child){margin-bottom:1rem}')
  })

  it('handles :is() and :where() selectors', () => {
    // commas inside selectors also get spaces stripped
    expect(minifyCSS(':is(h1, h2, h3) { font-weight: bold }')).toBe(':is(h1,h2,h3){font-weight:bold}')
    expect(minifyCSS(':where(.a, .b) { color: red }')).toBe(':where(.a,.b){color:red}')
  })

  it('handles universal selector', () => {
    expect(minifyCSS('* { box-sizing: border-box }')).toBe('*{box-sizing:border-box}')
  })

  // --- selector-function whitespace (#552: Tailwind group-* variants) ---

  it('preserves the descendant combinator space before * inside :is()/:where()', () => {
    // Tailwind v4 group-* variants emit a universal selector inside :is(:where(.group)…).
    // The space before * is significant; stripping it produces an invalid selector.
    expect(minifyCSS('.x{&:is(:where(.group):hover *){color:red}}'))
      .toBe('.x{&:is(:where(.group):hover *){color:red}}')
    expect(minifyCSS('.x{&:is(:where(.group)[data-open] *){display:block}}'))
      .toBe('.x{&:is(:where(.group)[data-open] *){display:block}}')
  })

  it('still strips spaces around * and / inside value functions like calc()', () => {
    // value-context parens keep calc minification (regression guard for the #552 fix)
    expect(minifyCSS('.x { width: calc(100% * 0.5) }')).toBe('.x{width:calc(100%*.5)}')
    expect(minifyCSS('.x { width: calc(100px / 2) }')).toBe('.x{width:calc(100px/2)}')
  })

  // --- At-rule edge cases ---

  it('handles @font-face', () => {
    const input = `
      @font-face {
        font-family: "MyFont";
        src: url("font.woff2") format("woff2");
      }
    `
    const result = minifyCSS(input)
    expect(result).toContain('@font-face{')
    expect(result).toContain('font-family:"MyFont"')
    expect(result).toContain('url("font.woff2")')
  })

  it('handles @supports', () => {
    const input = `
      @supports (display: grid) {
        .container {
          display: grid;
        }
      }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('@supports')
    expect(result).toContain('display:grid')
  })

  it('handles @import', () => {
    expect(minifyCSS('@import url("styles.css") ;')).toBe('@import url("styles.css");')
  })

  it('handles nested media queries', () => {
    const input = `
      @media screen {
        @media (min-width: 768px) {
          .x { color: red; }
        }
      }
    `
    const result = minifyCSS(input)
    expect(result).not.toContain('  ')
    expect(result).toContain('@media screen{@media')
  })

  // --- Whitespace edge cases ---

  it('handles \\r\\n line endings', () => {
    expect(minifyCSS('.x {\r\n  color: red;\r\n}')).toBe('.x{color:red}')
  })

  it('handles tabs', () => {
    expect(minifyCSS('.x\t{\tcolor:\tred\t}')).toBe('.x{color:red}')
  })

  it('removes trailing whitespace after last rule', () => {
    expect(minifyCSS('.x { color: red }   ')).toBe('.x{color:red}')
  })

  it('removes leading whitespace before first rule', () => {
    expect(minifyCSS('   .x { color: red }')).toBe('.x{color:red}')
  })

  // --- Value edge cases ---

  it('strips space before !important', () => {
    expect(minifyCSS('.x { color: red !important }')).toBe('.x{color:red!important}')
    expect(minifyCSS('.x { margin: 0 auto !important }')).toBe('.x{margin:0 auto!important}')
  })

  it('handles multiple values in shorthand', () => {
    expect(minifyCSS('.x { margin: 10px 20px 30px 40px }')).toBe('.x{margin:10px 20px 30px 40px}')
  })

  it('handles rgb/rgba functions', () => {
    // commas strip surrounding spaces
    expect(minifyCSS('.x { color: rgba(255, 0, 0, 0.5) }')).toBe('.x{color:rgba(255,0,0,.5)}')
  })

  it('handles var() references', () => {
    expect(minifyCSS('.x { color: var(--primary, blue) }')).toBe('.x{color:var(--primary,blue)}')
  })

  it('handles var() with calc() fallback', () => {
    expect(minifyCSS('.x { width: var(--w, calc(100% - 20px)) }')).toBe('.x{width:var(--w,calc(100% - 20px))}')
  })

  it('handles transform with multiple functions', () => {
    expect(minifyCSS('.x { transform: translate(10px, 20px) rotate(45deg) scale(1.5) }')).toBe('.x{transform:translate(10px,20px) rotate(45deg) scale(1.5)}')
  })

  it('handles grid template', () => {
    expect(minifyCSS('.x { grid-template-columns: repeat(3, 1fr) }')).toBe('.x{grid-template-columns:repeat(3,1fr)}')
  })

  it('handles empty rule', () => {
    expect(minifyCSS('.x {  }')).toBe('.x{}')
  })

  it('handles single character input', () => {
    expect(minifyCSS('*')).toBe('*')
  })

  it('handles deeply nested braces', () => {
    const input = '@media screen { @supports (display: grid) { .x { color: red } } }'
    const result = minifyCSS(input)
    // space preserved between @supports and ( since neither is CSS punctuation on both sides
    expect(result).toBe('@media screen{@supports (display:grid){.x{color:red}}}')
  })

  // --- Trailing semicolons ---

  it('strips trailing semicolon before }', () => {
    expect(minifyCSS('.x { color: red; }')).toBe('.x{color:red}')
  })

  it('strips trailing semicolon with multiple declarations', () => {
    expect(minifyCSS('.x { color: red; display: block; }')).toBe('.x{color:red;display:block}')
  })

  it('strips trailing semicolon with whitespace before }', () => {
    expect(minifyCSS('.x { color: red;  \n  }')).toBe('.x{color:red}')
  })

  it('preserves non-trailing semicolons', () => {
    expect(minifyCSS('.x { color: red; display: block }')).toBe('.x{color:red;display:block}')
  })

  it('strips trailing semicolons in nested rules', () => {
    const input = '@media screen { .x { color: red; } .y { display: block; } }'
    expect(minifyCSS(input)).toBe('@media screen{.x{color:red}.y{display:block}}')
  })

  // --- Leading zeros ---

  it('strips leading zero from decimal values', () => {
    expect(minifyCSS('.x { opacity: 0.5 }')).toBe('.x{opacity:.5}')
    expect(minifyCSS('.x { opacity: 0.75 }')).toBe('.x{opacity:.75}')
  })

  it('strips leading zero from decimal with units', () => {
    expect(minifyCSS('.x { margin: 0.5rem }')).toBe('.x{margin:.5rem}')
    expect(minifyCSS('.x { line-height: 0.8em }')).toBe('.x{line-height:.8em}')
  })

  it('does not strip zero from non-decimal values', () => {
    expect(minifyCSS('.x { z-index: 0 }')).toBe('.x{z-index:0}')
    expect(minifyCSS('.x { margin: 0 }')).toBe('.x{margin:0}')
  })

  it('does not strip zero from integers like 10.5', () => {
    expect(minifyCSS('.x { width: 10.5px }')).toBe('.x{width:10.5px}')
    expect(minifyCSS('.x { width: 100.25px }')).toBe('.x{width:100.25px}')
  })

  it('strips leading zero in multiple values', () => {
    expect(minifyCSS('.x { margin: 0.5rem 0.25rem }')).toBe('.x{margin:.5rem .25rem}')
  })

  it('strips leading zero in calc', () => {
    expect(minifyCSS('.x { width: calc(100% - 0.5rem) }')).toBe('.x{width:calc(100% - .5rem)}')
  })

  it('strips leading zero in rgba', () => {
    expect(minifyCSS('.x { color: rgba(0, 0, 0, 0.5) }')).toBe('.x{color:rgba(0,0,0,.5)}')
  })

  it('does not strip leading zero inside strings', () => {
    expect(minifyCSS('.x::after { content: "0.5" }')).toBe('.x::after{content:"0.5"}')
  })

  it('handles 0.0 value', () => {
    expect(minifyCSS('.x { opacity: 0.0 }')).toBe('.x{opacity:.0}')
  })
})

describe('minifyJSON', () => {
  it('strips whitespace from formatted JSON', () => {
    const input = '{ "key" : "value" ,  "num" : 42 }'
    expect(minifyJSON(input)).toBe('{"key":"value","num":42}')
  })

  it('strips whitespace from multiline JSON', () => {
    const input = `{
  "name": "test",
  "nested": {
    "arr": [1, 2, 3]
  }
}`
    expect(minifyJSON(input)).toBe('{"name":"test","nested":{"arr":[1,2,3]}}')
  })

  it('handles already compact JSON', () => {
    const input = '{"a":1}'
    expect(minifyJSON(input)).toBe('{"a":1}')
  })

  it('handles JSON arrays', () => {
    const input = '[ 1 , 2 , 3 ]'
    expect(minifyJSON(input)).toBe('[1,2,3]')
  })

  it('preserves string values with spaces', () => {
    const input = '{ "msg" : "hello   world" }'
    expect(minifyJSON(input)).toBe('{"msg":"hello   world"}')
  })

  it('handles schema.org ld+json', () => {
    const input = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "My Page"
}`
    expect(minifyJSON(input)).toBe('{"@context":"https://schema.org","@type":"WebPage","name":"My Page"}')
  })

  it('throws on invalid JSON', () => {
    expect(() => minifyJSON('not json')).toThrow()
  })
})

describe('large input performance', () => {
  it.each([
    ['CSS', minifyCSS, '.item   { color: red; padding: calc(1rem + 2px); } /* comment */\n'],
  ] as const)('keeps %s minification near linear', (_, minify, unit) => {
    const small = unit.repeat(Math.ceil(32_768 / unit.length))
    const large = unit.repeat(Math.ceil(262_144 / unit.length))

    minify(small)
    const smallStart = performance.now()
    for (let i = 0; i < 5; i++)
      minify(small)
    const smallAverage = (performance.now() - smallStart) / 5

    const largeStart = performance.now()
    minify(large)
    const largeDuration = performance.now() - largeStart

    expect(largeDuration).toBeLessThan(smallAverage * 40)
  })

  it.each([
    ['CSS', minifyCSS, '.a{color:red}'],
  ] as const)('fast-passes candidate-free %s', (_, minify, unit) => {
    const input = unit.repeat(Math.ceil(4_194_304 / unit.length))
    const start = performance.now()
    const result = minify(input)

    expect(result).toBe(input)
    expect(performance.now() - start).toBeLessThan(50)
  })
})
