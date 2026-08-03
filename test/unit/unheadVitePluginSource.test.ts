import { describe, expect, it, vi } from 'vitest'
import { resolveUnheadVitePluginSource, supportsUnheadV2Bundler } from '../../src/build-time/resolveUnheadVitePluginSource'

describe('resolveUnheadVitePluginSource', () => {
  it('resolves the v3 plugin from the Nuxt dependency tree before the app root', () => {
    const hostImportPath = new URL('file:///app/node_modules/nuxt/')
    const appImportPath = new URL('file:///app/node_modules/')
    const resolvePath = vi.fn(() => '/app/node_modules/nuxt/node_modules/@unhead/vue/dist/vite.mjs')

    const source = resolveUnheadVitePluginSource({
      unheadMajor: 3,
      hostImportPaths: [hostImportPath],
      importPaths: [appImportPath],
    }, resolvePath)

    expect(resolvePath).toHaveBeenCalledWith('@unhead/vue/vite', {
      try: true,
      from: [hostImportPath, appImportPath],
    })
    expect(source).toEqual({
      _tag: 'vue',
      url: 'file:///app/node_modules/nuxt/node_modules/@unhead/vue/dist/vite.mjs',
    })
  })

  it('keeps resolving the v2 plugin from the optional bundler peer', () => {
    const appImportPath = new URL('file:///app/node_modules/')
    const resolvePath = vi.fn(() => '/app/node_modules/@unhead/bundler/dist/vite.mjs')

    const source = resolveUnheadVitePluginSource({
      unheadMajor: 2,
      hostImportPaths: [],
      importPaths: [appImportPath],
    }, resolvePath)

    expect(resolvePath).toHaveBeenCalledWith('@unhead/bundler/vite', {
      try: true,
      from: [appImportPath],
    })
    expect(source).toEqual({
      _tag: 'bundler',
      url: 'file:///app/node_modules/@unhead/bundler/dist/vite.mjs',
    })
  })

  it('rejects bundler versions that require Unhead v3 exports', () => {
    expect(supportsUnheadV2Bundler('3.2.1')).toBe(true)
    expect(supportsUnheadV2Bundler('3.3.0')).toBe(false)
  })
})
