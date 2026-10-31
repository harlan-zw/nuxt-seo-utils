import { fileURLToPath } from 'node:url'
import { buildNuxt, loadNuxt, writeTypes } from '@nuxt/kit'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('preserves public runtime config types with the dev debug route', async () => {
  const rootDir = fileURLToPath(new URL('../fixtures/debug-types', import.meta.url))
  const nuxt = await loadNuxt({
    cwd: rootDir,
    dev: true,
    overrides: { _prepare: true, devtools: { enabled: false } },
  })
  try {
    // Generate dev route and config declarations without starting a server or bundling.
    await buildNuxt(nuxt)
    await writeTypes(nuxt)
    const configPath = `${nuxt.options.buildDir}/tsconfig.app.json`
    const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
      },
    })!
    const options: ts.CompilerOptions = {
      ...parsed.options,
      noEmit: true,
      skipLibCheck: false,
      incremental: false,
    }
    const handler = fileURLToPath(new URL('../../src/runtime/server/routes/__nuxt-seo-utils/debug.ts', import.meta.url))
    // Consumers use emitted declarations, whose inferred types can re-enter Nuxt's schema bridge.
    const runtimeTypes = fileURLToPath(new URL('../../src/runtime/types.ts', import.meta.url))
    const emitter = ts.createProgram([handler, runtimeTypes], {
      ...options,
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
    })
    let declaration = ''
    emitter.emit(emitter.getSourceFile(handler), (_file, contents) => {
      declaration = contents
    })
    if (!declaration)
      throw new Error('The debug handler declaration could not be emitted.')
    const host = ts.createCompilerHost(options)
    const readFile = host.readFile
    host.readFile = file => file === handler ? declaration : readFile(file)
    const files = [
      `${nuxt.options.buildDir}/types/runtime-config.d.ts`,
      `${rootDir}/config-types.ts`,
    ]
    // Nuxt loads route types before config. Reversing this order can hide the cycle.
    const program = ts.createProgram([
      `${nuxt.options.buildDir}/server-routes.d.ts`,
      `${nuxt.options.buildDir}/nuxt.d.ts`,
      ...parsed.fileNames,
      ...files,
    ], options, host)
    // Check the generated bridge and consumer, excluding unrelated dependency diagnostics.
    const diagnostics = ts.getPreEmitDiagnostics(program).filter(diagnostic => diagnostic.file && files.includes(diagnostic.file.fileName))
    expect(ts.formatDiagnostics(diagnostics, {
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      getCanonicalFileName: file => file,
      getNewLine: () => '\n',
    })).toBe('')
  }
  finally {
    await nuxt.close()
  }
}, 60_000)
