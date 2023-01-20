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
   * Allows you to resolve aliasing when linking internal files.
   */
  resolveAliases: boolean
  /**
   * The template used to render the og:title. Use %s to insert the og:title.
   */
  ogTitleTemplate: string
  /**
   * The template used to render the og:title. Use %s to insert the og:description.
   */
  ogDescriptionTemplate: string
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-unhead',
    configKey: 'head',
    compatibility: {
      nuxt: '^3.0.0',
    },
  },
  defaults: {
    seoOptimise: true,
    resolveAliases: true,
    ogTitleTemplate: '%s',
    ogDescriptionTemplate: '%s',
  },
  async setup(options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    options = Object.assign({}, options, nuxt.options.unhead)

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

    nuxt.hooks.hook('prepare:types', ({ references }) => {
      references.push({ path: resolve(nuxt.options.buildDir, 'nuxt-unhead.d.ts') })
    })

    // remove useServerHead in client build
    // @ts-expect-error vite version mismatch
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
