import type { Nuxt } from '@nuxt/schema'
import type { ColorModeIconLinks } from '../runtime/types'
import type { ColorModeIconTags, CompiledHeadShapes, HeadCompiler } from './compiledHead'
import { addTemplate, directoryToURL } from '@nuxt/kit'
import { resolveModulePath } from 'exsolve'
import { compileColorModeIcons, compiledHeadModule, compileHeadShapes } from './compiledHead'

export type CompiledHeadSetup
  = | { _tag: 'Off' }
    | {
      _tag: 'On'
      /** Compiles the color mode icon links into the module, for the compiled plugin. */
      addColorModeIcons: (icons: ColorModeIconLinks) => { _tag: 'Ok' } | { _tag: 'Bail', reason: string }
    }
    | { _tag: 'Unavailable', reason: string }

/** Whether the app turns on Unhead compiler mode: `unhead.vite.compile` in the Nuxt config. */
export function isCompilerMode(nuxt: Nuxt): boolean {
  const vite = (nuxt.options as { unhead?: { vite?: false | { compile?: unknown } } }).unhead?.vite
  return !!vite && !!vite.compile
}

async function compileShapes(nuxt: Nuxt, tagPriority: unknown): Promise<{ _tag: 'Ok', shapes: CompiledHeadShapes, compiler: HeadCompiler } | { _tag: 'Unavailable', reason: string }> {
  // The compiler must be the one of the Unhead that renders the app, so it resolves from the app.
  const compilerPath = resolveModulePath('unhead/compiled', {
    try: true,
    from: nuxt.options.modulesDir.map(dir => directoryToURL(dir)),
  })
  // A dynamic import: an Unhead without the compiler must not break the module when compiler mode is off.
  const compiler = compilerPath ? await import(compilerPath) as Partial<HeadCompiler> : undefined
  if (typeof compiler?.compileTags !== 'function' || typeof compiler.dynamicValue !== 'function')
    return { _tag: 'Unavailable', reason: 'the installed Unhead has no compiler (compileTags in unhead/compiled)' }
  // The compiled plugins change tags through tag transforms
  const pluginsPath = resolveModulePath('unhead/plugins', { try: true, from: nuxt.options.modulesDir.map(dir => directoryToURL(dir)) })
  const plugins = pluginsPath ? await import(pluginsPath) as { withTagTransform?: unknown } : undefined
  if (typeof plugins?.withTagTransform !== 'function')
    return { _tag: 'Unavailable', reason: 'the installed Unhead has no tag transforms (withTagTransform in unhead/plugins)' }
  const result = compileHeadShapes(compiler as HeadCompiler, tagPriority)
  return result._tag === 'Ok' ? { ...result, compiler: compiler as HeadCompiler } : { _tag: 'Unavailable', reason: `the ${result.shape} entry cannot compile: ${result.reason}` }
}

/**
 * Compiles the default head entries for compiler mode and adds them as
 * `#nuxt-seo-utils/compiled-head`. With compiler mode off, or with an Unhead that has no
 * compiler, the module keeps its normal plugins and the module exports `shapes = null`.
 */
export async function setupCompiledHead(nuxt: Nuxt, tagPriority: unknown, runtimeDir: string): Promise<CompiledHeadSetup> {
  const compiled = isCompilerMode(nuxt) ? await compileShapes(nuxt, tagPriority) : undefined
  const shapes = compiled?._tag === 'Ok' ? compiled.shapes : null
  let colorModeIcons: ColorModeIconTags | null = null
  const template = addTemplate({
    filename: 'nuxt-seo-utils/compiled-head.mjs',
    write: true,
    getContents: () => compiledHeadModule(shapes, tagPriority, `${runtimeDir}/shared/compiledHeadShapes`, colorModeIcons),
  })
  nuxt.options.alias['#nuxt-seo-utils/compiled-head'] = template.dst
  if (!compiled)
    return { _tag: 'Off' }
  if (compiled._tag === 'Unavailable')
    return compiled
  return {
    _tag: 'On',
    addColorModeIcons(icons) {
      const result = compileColorModeIcons(compiled.compiler, icons)
      if (result._tag === 'Bail')
        return result
      colorModeIcons = result.tags
      return { _tag: 'Ok' }
    },
  }
}
