import { fileURLToPath } from 'url'
import { addComponent, addImportsSources, addPlugin, addTemplate, addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import { resolve } from 'pathe'
import fg from 'fast-glob'
import UnheadVite from '@unhead/addons/vite'
import { headTypeTemplate } from './templates'

export interface ModuleOptions {
  /**
   * Whether meta tags should be optimised for SEO.
   */
  seoOptimise: boolean
  /**
   * Not supported yet, waiting for v1 @vueuse/head.
   *
   * @deprecated not ready
   */
  resolveAliases: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unhead',
    configKey: 'head',
    compatibility: {
      nuxt: '3.0.0',
    },
  },
  defaults: {
    seoOptimise: true,
    resolveAliases: true,
  },
  // @ts-expect-error untyped
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    addTemplate({
      filename: 'nuxt-unhead-config.mjs',
      getContents: () => `export default ${JSON.stringify(options)}`,
    })

    const getPaths = async () => ({
      public: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'public') }),
      assets: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'assets') }),
    })
    // paths.d.ts
    addTemplate({ ...headTypeTemplate, options: { getPaths } })

    // @ts-expect-error untyped
    nuxt.hooks.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'head.d.ts') })
    })

    // remove useServerHead in client build
    addVitePlugin(UnheadVite({ root: nuxt.options.rootDir }))

    await addComponent({
      name: 'DebugHead',
      mode: 'client',
      filePath: `${runtimeDir}/components/DebugHead.client.vue`,
    })

    // add non useHead composables
    addImportsSources({
      from: '@vueuse/head',
      imports: [
        'useServerHead',
        'useSeoMeta',
        'injectHead',
      ],
    })

    addPlugin({ src: resolve(runtimeDir, 'plugin') })
  },
})
