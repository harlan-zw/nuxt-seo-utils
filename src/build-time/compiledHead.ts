import type { CompiledHeadShape, CompiledHeadShapeName, CompiledHeadShapes } from '../runtime/shared/compiledHeadShapes'
import { compiledHeadShapes, compiledHeadShapeValues, SPECIAL_VALUES } from '../runtime/shared/compiledHeadShapes'

export type { CompiledHeadShapes }

type CompileResult = { _tag: 'Ok', tags: unknown } | { _tag: 'Bail', reason: string }

/** The Unhead compiler API the build needs, from `unhead/compiled`. */
export interface HeadCompiler {
  compileTags: (input: unknown, options?: { dynamicValues?: number }) => CompileResult
  dynamicValue: (index: number) => string
}

export type CompiledHeadResult
  = | { _tag: 'Ok', shapes: CompiledHeadShapes }
    | { _tag: 'Bail', shape: CompiledHeadShapeName, reason: string }

const SPECIAL_INPUT = { null: null, undefined, false: false } as const

/**
 * Compiles the default head entries of the module. `tagPriority` is the module option, which
 * the shapes that take it hold as a static value. Any shape that cannot compile bails the
 * whole result, so the build keeps the normal plugins.
 */
export function compileHeadShapes(compiler: HeadCompiler, tagPriority: unknown): CompiledHeadResult {
  const shapes: CompiledHeadShapes = {}
  for (const name of Object.keys(compiledHeadShapes) as CompiledHeadShapeName[]) {
    const build = compiledHeadShapes[name] as (...args: unknown[]) => unknown
    const count = compiledHeadShapeValues[name]
    // `tagPriority` follows the values, for the shapes that take it
    const withValues = (values: unknown[]) => build(...values, tagPriority)
    const result = compiler.compileTags(withValues(Array.from({ length: count }, (_, i) => compiler.dynamicValue(i))), { dynamicValues: count })
    if (result._tag === 'Bail')
      return { _tag: 'Bail', shape: name, reason: result.reason }
    const shape: CompiledHeadShape = { tags: result.tags, special: {} }
    if (count === 1) {
      for (const special of SPECIAL_VALUES) {
        const variant = compiler.compileTags(withValues([SPECIAL_INPUT[special]]))
        if (variant._tag === 'Ok')
          shape.special[special] = variant.tags
      }
    }
    shapes[name] = shape
  }
  return { _tag: 'Ok', shapes }
}

/**
 * The `#nuxt-seo-utils/compiled-head` module. `shapes` is `null` when compiler mode is off.
 * `typesPath` is the module that exports `CompiledHeadShapes`, for the JSDoc type.
 */
export function compiledHeadModule(shapes: CompiledHeadShapes | null, tagPriority: unknown, typesPath: string): string {
  return [
    `/** @type {import('${typesPath}').CompiledHeadShapes | null} */`,
    `export const shapes = ${JSON.stringify(shapes)}`,
    `/** @type {string | number | null} */`,
    `export const tagPriority = ${JSON.stringify(tagPriority ?? null)}`,
  ].join('\n')
}
