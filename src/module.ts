import { fileURLToPath } from 'node:url'
import {
  addComponent,
  addPlugin,
  addTemplate,
  addVitePlugin,
  defineNuxtModule,
  useLogger,
} from '@nuxt/kit'
import { dirname, resolve } from 'pathe'
import fg from 'fast-glob'
import UnheadVite from '@unhead/addons/vite'
import { withBase } from 'ufo'
import { readPackageJSON } from 'pkg-types'
import { headTypeTemplate } from './templates'
import inferTagsFromFiles from './features/inferTagsFromFiles'
import moreDefaultTags from './features/moreDefaultTags'

export interface ModuleOptions {
  /**
   * Whether meta tags should be optimised for SEO.
   */
  seoOptimise: boolean
  /**
   * Should the files in the public directory be used to infer tags.
   *
   * @default true
   */
  inferTagsFromFiles: boolean
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
    inferTagsFromFiles: true,
    seoOptimise: true,
  },
  async setup(config, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    const logger = useLogger('nuxt-seo-experiments')

    // no siteUrl is okay, we presume they are SSR and we'll infer it from the request
    let siteUrl = nuxt.options.runtimeConfig.public.siteUrl || process.env.NUXT_PUBLIC_SITE_URL || ''
    if (nuxt.options.nitro.baseURL && !siteUrl.endsWith(nuxt.options.nitro.baseURL))
      siteUrl = withBase(nuxt.options.nitro.baseURL || '/', siteUrl)

    if (nuxt.options._generate && !siteUrl)
      logger.warn('You are prerendering your site without a siteUrl, this may cause issues with some SEO tags.')

    // set a default title template
    nuxt.options.app.head.titleTemplate = nuxt.options.app.head.titleTemplate || '%s %separator %siteName'
    nuxt.options.runtimeConfig.public.titleSeparator = nuxt.options.runtimeConfig.public.titleSeparator || '–'
    // let's infer from stuff from package.json because why not
    nuxt.options.app.head.templateParams = nuxt.options.app.head.templateParams || {}
    const pkgJson = await readPackageJSON()
    nuxt.options.app.head.templateParams.siteName = nuxt.options.app.head.templateParams.siteName || pkgJson?.name || dirname(nuxt.options.srcDir)
    // infer description from package.json description if set
    nuxt.options.app.head.meta = nuxt.options.app.head.meta || []
    if (!nuxt.options.app.head.meta.find(meta => meta.name === 'description')) {
      const description = pkgJson.description
      if (description)
        nuxt.options.app.head.meta.push({ name: 'description', content: description })
    }

    // support the previous config key
    // @ts-expect-error untyped
    config = Object.assign({}, config, nuxt.options.head)
    nuxt.options.runtimeConfig.public['nuxt-seo-experiments'] = config

    if (config.inferTagsFromFiles)
      await inferTagsFromFiles(nuxt, { siteUrl })

    moreDefaultTags(nuxt)

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

    addPlugin({ src: resolve(runtimeDir, 'plugins', 'unheadAddons') })
    addPlugin({ src: resolve(runtimeDir, 'plugins', 'provideHostBaseToTags.server'), mode: 'server' })
  },
})
