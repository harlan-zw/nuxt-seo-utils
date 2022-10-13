import { fileURLToPath } from 'url'
import { addComponent, addImports, addPlugin, addTemplate, defineNuxtModule } from '@nuxt/kit'
import { resolve } from 'pathe'
import fg from 'fast-glob'
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
    name: 'nuxt-hedge',
    configKey: 'head',
    compatibility: {
      nuxt: '>=3.0.0-rc.12',
    },
  },
  defaults: {
    seoOptimise: true,
    resolveAliases: false,
  },
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    addTemplate({
      filename: 'nuxt-hedge-config.mjs',
      getContents: () => `export default ${JSON.stringify(options)}`,
    })

    const getPaths = async () => ({
      public: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'public') }),
    })
    // paths.d.ts
    addTemplate({ ...headTypeTemplate, options: { getPaths } })

    nuxt.hooks.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'head.d.ts') })
    })

    addImports({
      name: 'useMetaTags',
      from: `${runtimeDir}/composables`,
    })

    await addComponent({
      name: 'DebugHead',
      mode: 'client',
      filePath: `${runtimeDir}/components/DebugHead.client.vue`,
    })

    addPlugin({ src: resolve(runtimeDir, 'plugin') })
  },
})
