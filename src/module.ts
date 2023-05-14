import { fileURLToPath } from 'node:url'
import { addComponent, addImportsSources, addPlugin, addTemplate, addVitePlugin, defineNuxtModule, hasNuxtCompatibility } from '@nuxt/kit'
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
   * Allows you to resolve aliasing when linking internal files.
   */
  resolveAliases: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-seo-experiments',
    configKey: 'seoExperiments',
    compatibility: {
      nuxt: '^3.4.0',
      bridge: false,
    },
  },
  defaults: {
    seoOptimise: true,
    resolveAliases: false,
  },
  async setup(config, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    // set a default title template
    nuxt.options.app.head.titleTemplate = nuxt.options.app.head.titleTemplate || '%s %separator %siteName'
    nuxt.options.runtimeConfig.public.titleSeparator = nuxt.options.runtimeConfig.public.titleSeparator || '–'

    // support the previous config key
    // @ts-expect-error untyped
    config = Object.assign({}, config, nuxt.options.head)
    nuxt.options.runtimeConfig.public['nuxt-seo-experiments'] = config

    nuxt.options.runtimeConfig.public['nuxt-unhead'] = config

    // avoid vue version conflicts
    nuxt.options.build.transpile.push('@unhead/vue', 'unhead')

    const getPaths = async () => ({
      public: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'public') }),
      assets: await fg(['**/*'], { cwd: resolve(nuxt.options.srcDir, 'assets') }),
    })
    // paths.d.ts
    addTemplate({ ...headTypeTemplate, options: { getPaths } })

    nuxt.hooks.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'nuxt-seo-experiments.d.ts') })
    })

    // remove useServerHead in client build
    addVitePlugin(UnheadVite())

    await addComponent({
      name: 'DebugHead',
      mode: 'client',
      filePath: `${runtimeDir}/components/DebugHead.client.vue`,
    })

    addPlugin({ src: resolve(runtimeDir, 'plugin') })
  },
})
