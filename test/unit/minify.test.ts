import { describe, expect, it } from 'vitest'
import { minifyCSS, minifyJS, minifyJSON } from '../../src/runtime/shared/minify'

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

  // --- String edge cases ---

  it('preserves template literals with expressions', () => {
    // eslint-disable-next-line no-template-curly-in-string
    expect(minifyJS('const x = `hello ${  name  } world`')).toBe('const x=`hello ${  name  } world`')
  })

  it('preserves strings containing backslashes', () => {
    expect(minifyJS('const x = "C:\\\\Users\\\\foo"')).toBe('const x="C:\\\\Users\\\\foo"')
  })

  it('preserves empty strings', () => {
    expect(minifyJS('const x = ""')).toBe('const x=""')
    expect(minifyJS('const x = \'\'')).toBe('const x=\'\'')
    expect(minifyJS('const x = ``')).toBe('const x=``')
  })

  it('preserves strings with comment-like patterns in single quotes', () => {
    expect(minifyJS('const x = \'/* not */ // also not\'')).toBe('const x=\'/* not */ // also not\'')
  })

  it('preserves strings with escaped backslash before quote', () => {
    // "test\\" — escaped backslash, then closing quote
    expect(minifyJS('const x = "test\\\\"')).toBe('const x="test\\\\"')
  })

  it('handles adjacent string literals', () => {
    expect(minifyJS('"a" + "b"')).toBe('"a"+"b"')
  })

  // --- Comment edge cases ---

  it('handles comment at end of file without newline', () => {
    expect(minifyJS('const x = 1 // comment')).toBe('const x=1')
  })

  it('handles multi-line comment spanning multiple lines', () => {
    const input = `const a = 1
/* this
   is
   a long
   comment */
const b = 2`
    const result = minifyJS(input)
    expect(result).not.toContain('comment')
    expect(result).toContain('const a=1')
    expect(result).toContain('const b=2')
  })

  it('handles empty comment', () => {
    expect(minifyJS('const x = /**/ 1')).toBe('const x=1')
  })

  it('handles comment-only input', () => {
    expect(minifyJS('// just a comment')).toBe('')
    expect(minifyJS('/* just a comment */')).toBe('')
  })

  it('handles multiple consecutive comments', () => {
    const input = `// comment 1
// comment 2
// comment 3
const x = 1`
    expect(minifyJS(input)).toBe('const x=1')
  })

  // --- Whitespace & ASI edge cases ---

  it('handles \\r\\n line endings', () => {
    expect(minifyJS('const a = 1\r\nconst b = 2')).toBe('const a=1\nconst b=2')
  })

  it('handles tabs mixed with spaces', () => {
    expect(minifyJS('const\t\tx\t=\t1')).toBe('const x=1')
  })

  it('preserves newline between return and value for ASI', () => {
    // return\nvalue is ASI hazard; newline should be preserved
    const input = 'return\nvalue'
    expect(minifyJS(input)).toBe('return\nvalue')
  })

  it('collapses multiple blank lines', () => {
    const input = 'const a = 1\n\n\n\nconst b = 2'
    expect(minifyJS(input)).toBe('const a=1\nconst b=2')
  })

  it('removes newline after opening brace in nested blocks', () => {
    expect(minifyJS('if (a) {\n  if (b) {\n    c()\n  }\n}')).toBe('if(a){if(b){c()}}')
  })

  it('removes whitespace before semicolons', () => {
    expect(minifyJS('x = 1 ;')).toBe('x=1;')
  })

  // --- Operator & syntax edge cases ---

  it('handles spread operator', () => {
    expect(minifyJS('const x = { ...a, ...b }')).toBe('const x={...a,...b}')
  })

  it('handles optional chaining', () => {
    expect(minifyJS('const x = a?.b?.c')).toBe('const x=a?.b?.c')
  })

  it('handles nullish coalescing', () => {
    expect(minifyJS('const x = a ?? b')).toBe('const x=a??b')
  })

  it('handles increment/decrement operators', () => {
    expect(minifyJS('x++ ; y--')).toBe('x++;y--')
  })

  it('handles unary operators', () => {
    expect(minifyJS('const x = !a && ~b')).toBe('const x=!a&&~b')
  })

  it('handles comma-separated expressions', () => {
    expect(minifyJS('const a = 1, b = 2, c = 3')).toBe('const a=1,b=2,c=3')
  })

  it('handles bitwise operators', () => {
    expect(minifyJS('x = a | b & c ^ d')).toBe('x=a|b&c^d')
  })

  it('handles exponentiation operator', () => {
    expect(minifyJS('const x = 2 ** 3')).toBe('const x=2**3')
  })

  it('handles arrow function without braces', () => {
    expect(minifyJS('const fn = x => x * 2')).toBe('const fn=x=>x*2')
  })

  it('handles destructuring assignment', () => {
    expect(minifyJS('const { a, b } = obj')).toBe('const{a,b}=obj')
  })

  it('handles array destructuring', () => {
    expect(minifyJS('const [ x, y ] = arr')).toBe('const[x,y]=arr')
  })

  // --- Real-world patterns ---

  it('handles JSON.parse pattern', () => {
    const input = 'window.__DATA__ = JSON.parse("{\\"key\\":\\"value\\"}")'
    const result = minifyJS(input)
    expect(result).toBe('window.__DATA__=JSON.parse("{\\"key\\":\\"value\\"}")')
  })

  it('handles try/catch/finally', () => {
    const input = `
      try {
        doSomething()
      } catch (e) {
        console.error(e)
      } finally {
        cleanup()
      }
    `
    const result = minifyJS(input)
    expect(result).toBe('try{doSomething()}catch(e){console.error(e)}finally{cleanup()}')
  })

  it('handles switch statement', () => {
    const input = `
      switch (x) {
        case 1:
          a()
          break
        case 2:
          b()
          break
        default:
          c()
      }
    `
    const result = minifyJS(input)
    expect(result).toContain('switch(x)')
    expect(result).toContain('case 1:')
    expect(result).toContain('break')
    expect(result).toContain('default:')
  })

  it('handles chained method calls', () => {
    const input = `
      document
        .querySelector(".app")
        .addEventListener("click", handler)
    `
    const result = minifyJS(input)
    expect(result).toBe('document\n.querySelector(".app")\n.addEventListener("click",handler)')
  })

  it('handles real Nuxt payload import script', () => {
    const input = `import p from "/_payload.js";window.__NUXT__={...p,config:{app:{baseURL:"/",buildAssetsDir:"/_nuxt/"}}}`
    const result = minifyJS(input)
    expect(result).toBe('import p from"/_payload.js";window.__NUXT__={...p,config:{app:{baseURL:"/",buildAssetsDir:"/_nuxt/"}}}')
  })

  it('handles for loop', () => {
    expect(minifyJS('for (let i = 0; i < 10; i++) {\n  sum += i\n}')).toBe('for(let i=0;i<10;i++){sum+=i}')
  })

  it('handles do while', () => {
    expect(minifyJS('do {\n  x++\n} while (x < 10)')).toBe('do{x++}while(x<10)')
  })

  it('handles class syntax', () => {
    const input = `
      class Foo extends Bar {
        constructor() {
          super()
        }
      }
    `
    const result = minifyJS(input)
    expect(result).toBe('class Foo extends Bar{constructor(){super()}}')
  })

  it('handles async/await', () => {
    const input = 'const data = await fetch("/api")'
    expect(minifyJS(input)).toBe('const data=await fetch("/api")')
  })

  it('handles typeof and instanceof', () => {
    expect(minifyJS('typeof window !== "undefined"')).toBe('typeof window!=="undefined"')
    expect(minifyJS('x instanceof Array')).toBe('x instanceof Array')
  })

  it('handles void and delete operators', () => {
    expect(minifyJS('void 0')).toBe('void 0')
    expect(minifyJS('delete obj.key')).toBe('delete obj.key')
  })

  it('handles new operator', () => {
    expect(minifyJS('const d = new Date()')).toBe('const d=new Date()')
  })

  it('handles throw statement', () => {
    expect(minifyJS('throw new Error("fail")')).toBe('throw new Error("fail")')
  })

  it('handles labeled statements', () => {
    expect(minifyJS('outer: for (;;) { break outer }')).toBe('outer:for(;;){break outer}')
  })

  it('handles single character input', () => {
    expect(minifyJS('x')).toBe('x')
    expect(minifyJS(';')).toBe(';')
  })

  it('handles deeply nested braces', () => {
    expect(minifyJS('a({ b: { c: { d: 1 } } })')).toBe('a({b:{c:{d:1}}})')
  })

  it('handles semicolon-terminated vs ASI lines', () => {
    const input = 'a();\nb()\nc();'
    // after ; newline is removed; between b() and c() newline is preserved for ASI
    expect(minifyJS(input)).toBe('a();b()\nc();')
  })

  it('handles very long single line', () => {
    const longVar = 'x'.repeat(1000)
    expect(minifyJS(`const ${longVar} = 1`)).toBe(`const ${longVar}=1`)
  })

  // --- Double unary / operator merging ---

  it('preserves space between - - to avoid creating --', () => {
    expect(minifyJS('x - -y')).toBe('x- -y')
  })

  it('preserves space between + + to avoid creating ++', () => {
    expect(minifyJS('x + +y')).toBe('x+ +y')
  })

  it('preserves space in a + ++b', () => {
    expect(minifyJS('a + ++b')).toBe('a+ ++b')
  })

  it('preserves space in a - --b', () => {
    expect(minifyJS('a - --b')).toBe('a- --b')
  })

  it('does not add space for actual ++ and -- operators', () => {
    expect(minifyJS('x++')).toBe('x++')
    expect(minifyJS('--y')).toBe('--y')
    // x++ + y keeps space between ++ and + to avoid ambiguity
    expect(minifyJS('x++ + y')).toBe('x++ +y')
  })

  // --- Keyword before non-ident ---

  it('handles return with unary minus', () => {
    expect(minifyJS('return -1')).toBe('return-1')
  })

  it('handles return with string', () => {
    expect(minifyJS('return "hello"')).toBe('return"hello"')
  })

  it('handles typeof with negation', () => {
    expect(minifyJS('typeof !x')).toBe('typeof!x')
  })

  // --- Control flow keywords ---

  it('handles else if', () => {
    expect(minifyJS('if (a) {\n  x()\n} else if (b) {\n  y()\n}')).toBe('if(a){x()}else if(b){y()}')
  })

  it('handles else block', () => {
    expect(minifyJS('if (a) {\n  x()\n} else {\n  y()\n}')).toBe('if(a){x()}else{y()}')
  })

  it('handles for...in', () => {
    expect(minifyJS('for (const k in obj) { }')).toBe('for(const k in obj){}')
  })

  it('handles for...of', () => {
    expect(minifyJS('for (const v of arr) { }')).toBe('for(const v of arr){}')
  })

  it('handles while loop', () => {
    expect(minifyJS('while (x > 0) {\n  x--\n}')).toBe('while(x>0){x--}')
  })

  // --- Template literal edge cases ---

  it('handles template literal with expression', () => {
    // eslint-disable-next-line no-template-curly-in-string
    expect(minifyJS('const x = `${a + b}`')).toBe('const x=`${a + b}`')
  })

  it('handles template literal with nested backtick expression', () => {
    // eslint-disable-next-line no-template-curly-in-string
    expect(minifyJS('const x = `a ${`b`} c`')).toBe('const x=`a ${`b`} c`')
  })

  it('handles tagged template literal', () => {
    // eslint-disable-next-line no-template-curly-in-string
    expect(minifyJS('html`<div>${x}</div>`')).toBe('html`<div>${x}</div>`')
  })

  // --- Property access patterns ---

  it('handles computed property access', () => {
    expect(minifyJS('obj["key"]')).toBe('obj["key"]')
  })

  it('handles method chaining across lines', () => {
    const input = 'promise\n  .then(a)\n  .catch(b)'
    const result = minifyJS(input)
    expect(result).toContain('.then(a)')
    expect(result).toContain('.catch(b)')
  })

  it('handles new with method call', () => {
    expect(minifyJS('new Foo().bar()')).toBe('new Foo().bar()')
  })

  // --- Edge cases around newline collapsing ---

  it('removes newline after closing brace before else', () => {
    // } is followed by newline then else; newline after } should be removed
    expect(minifyJS('if (a) {\n  x()\n}\nelse {\n  y()\n}')).toBe('if(a){x()}else{y()}')
  })

  it('preserves newline between two expressions for ASI', () => {
    expect(minifyJS('a()\nb()')).toBe('a()\nb()')
  })

  it('preserves newline after return for ASI hazard', () => {
    // return\n{} would be ASI to "return; {}" not "return {}"
    expect(minifyJS('return\n{}')).toBe('return\n{}')
  })

  it('removes newline between comma-separated items', () => {
    // commas are not ident chars so no space added, but ASI newline check:
    // prev is , and newline present but , is not { } ; so newline preserved? Let's verify
    const input = 'var a = [\n  1,\n  2,\n  3\n]'
    const result = minifyJS(input)
    expect(result).not.toContain('  ')
  })

  // --- Mixed comments and code ---

  it('handles inline comment after code on same line', () => {
    expect(minifyJS('x = 1 // set x\ny = 2 // set y')).toBe('x=1\ny=2')
  })

  it('handles block comment replacing expression', () => {
    expect(minifyJS('a + /* b + */ c')).toBe('a+c')
  })

  // --- Unicode and special identifiers ---

  it('handles $ and _ identifiers', () => {
    expect(minifyJS('const $el = _ref')).toBe('const $el=_ref')
  })

  it('handles numeric property access', () => {
    expect(minifyJS('arr[0] + arr[1]')).toBe('arr[0]+arr[1]')
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
