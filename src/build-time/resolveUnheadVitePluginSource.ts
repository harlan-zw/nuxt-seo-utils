import { pathToFileURL } from 'node:url'

export type UnheadVitePluginSource
  = | { _tag: 'vue', url: string }
    | { _tag: 'missing-vue' }

interface ResolveOptions {
  try: true
  from: URL[]
}

interface ResolveUnheadVitePluginSourceInput {
  hostImportPaths: URL[]
  importPaths: URL[]
}

type ResolvePath = (id: string, options: ResolveOptions) => string | undefined

export function resolveUnheadVitePluginSource(
  input: ResolveUnheadVitePluginSourceInput,
  resolvePath: ResolvePath,
): UnheadVitePluginSource {
  const path = resolvePath('@unhead/vue/vite', {
    try: true,
    from: [...input.hostImportPaths, ...input.importPaths],
  })
  return path
    ? { _tag: 'vue', url: pathToFileURL(path).href }
    : { _tag: 'missing-vue' }
}
