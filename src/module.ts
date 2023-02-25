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
   * The template used to render the title. Use %s to insert the title.
   */
  titleTemplate: string
  /**
   * The template used to render the og:title. Use %s to insert the og:title.
   *
   * @default `app.head.titleTemplate` || '%pageTitle %separator %siteName'
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
    configKey: 'unhead',
    compatibility: {
      nuxt: '^3.1.0',
      bridge: false,
    },
  },
  defaults(nuxt) {
    const titleTemplate = (nuxt.options.app.head.titleTemplate as string | undefined) || '%pageTitle %titleSeparator %siteName'
    return {
      seoOptimise: true,
      resolveAliases: false,
      titleTemplate,
      ogTitleTemplate: titleTemplate,
      ogDescriptionTemplate: '%s',
    }
  },
  async setup(config, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    // set a default title template
    nuxt.options.app.head.titleTemplate = nuxt.options.app.head.titleTemplate || config.titleTemplate
    nuxt.options.runtimeConfig.public.titleSeparator = nuxt.options.runtimeConfig.public.titleSeparator || '–'

    // support the previous config key
    // @ts-expect-error untyped
    config = Object.assign({}, config, nuxt.options.head)

    nuxt.options.runtimeConfig.public['nuxt-unhead'] = config

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
        'injectHead',
      ],
    })

    addPlugin({ src: resolve(runtimeDir, 'plugin') })
  },
})
