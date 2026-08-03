import { pathToFileURL } from 'node:url'

export type UnheadVitePluginSource
  = | { _tag: 'vue', url: string }
    | { _tag: 'bundler', url: string }
    | { _tag: 'missing-vue' }
    | { _tag: 'missing-bundler' }

interface ResolveOptions {
  try: true
  from: URL[]
}

interface ResolveUnheadVitePluginSourceInput {
  unheadMajor: 2 | 3
  hostImportPaths: URL[]
  importPaths: URL[]
}

type ResolvePath = (id: string, options: ResolveOptions) => string | undefined

export function supportsUnheadV2Bundler(version: string): boolean {
  const [major, minor] = version.split('.')
  return major === '3' && minor === '2'
}

export function resolveUnheadVitePluginSource(
  input: ResolveUnheadVitePluginSourceInput,
  resolvePath: ResolvePath,
): UnheadVitePluginSource {
  if (input.unheadMajor >= 3) {
    const path = resolvePath('@unhead/vue/vite', {
      try: true,
      from: [...input.hostImportPaths, ...input.importPaths],
    })
    return path
      ? { _tag: 'vue', url: pathToFileURL(path).href }
      : { _tag: 'missing-vue' }
  }

  const path = resolvePath('@unhead/bundler/vite', {
    try: true,
    from: input.importPaths,
  })
  return path
    ? { _tag: 'bundler', url: pathToFileURL(path).href }
    : { _tag: 'missing-bundler' }
}
