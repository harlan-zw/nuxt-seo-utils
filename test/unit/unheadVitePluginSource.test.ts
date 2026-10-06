import { describe, expect, it, vi } from 'vitest'
import { resolveUnheadVitePluginSource } from '../../src/build-time/resolveUnheadVitePluginSource'

describe('resolveUnheadVitePluginSource', () => {
  it('resolves the v3 plugin from the Nuxt dependency tree before the app root', () => {
    const hostImportPath = new URL('file:///app/node_modules/nuxt/')
    const appImportPath = new URL('file:///app/node_modules/')
    const resolvePath = vi.fn(() => '/app/node_modules/nuxt/node_modules/@unhead/vue/dist/vite.mjs')

    const source = resolveUnheadVitePluginSource({
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
})
