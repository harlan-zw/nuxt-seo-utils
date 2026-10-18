import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('preserves consumer runtime config and app SEO metadata types', () => {
  const runtimeSource = fileURLToPath(new URL('../../src/runtime/types.ts', import.meta.url))
  const runtimeDeclaration = runtimeSource.replace(/\.ts$/, '.d.ts')
  const emitted = ts.transpileDeclaration(ts.sys.readFile(runtimeSource)!, {
    fileName: runtimeSource,
    reportDiagnostics: true,
  })
  const files = [
    fileURLToPath(new URL('../types/seo-utils.ts', import.meta.url)),
    runtimeDeclaration,
  ]
  const options: ts.CompilerOptions = {
    strict: true,
    noEmit: true,
    skipLibCheck: false,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  const fileExists = host.fileExists
  const readFile = host.readFile
  // Resolve the consumer import to emitted declarations instead of source.
  host.fileExists = file => file === runtimeSource ? false : file === runtimeDeclaration || fileExists(file)
  host.readFile = file => file === runtimeDeclaration ? emitted.outputText : readFile(file)
  const program = ts.createProgram(files, options, host)
  // Check the consumer and our declarations against real dependency types.
  // Dependency internals need Nuxt's generated application aliases.
  const diagnostics = [
    ...emitted.diagnostics ?? [],
    ...program.getOptionsDiagnostics(),
    ...files.flatMap((file) => {
      const source = program.getSourceFile(file)!
      return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)]
    }),
  ]
  expect(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: ts.sys.getCurrentDirectory,
    getCanonicalFileName: file => file,
    getNewLine: () => '\n',
  })).toBe('')
}, 30_000)
