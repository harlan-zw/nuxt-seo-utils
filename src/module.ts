import {
  addPlugin,
  addServerHandler,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  useLogger,
} from '@nuxt/kit'
import UnheadVite from '@unhead/addons/vite'
import { installNuxtSiteConfig } from 'nuxt-site-config-kit'
import generateTagsFromPublicFiles from './features/generateTagsFromPublicFiles'
import setupNuxtConfigAppHeadWithMoreDefaults from './features/setupNuxtConfigAppHeadWithMoreDefaults'
import extendNuxtConfigAppHeadSeoMeta from './features/extendNuxtConfigAppHeadSeoMeta'
import extendNuxtConfigAppHeadTypes from './features/extendNuxtConfigAppHeadTypes'
import generateTagsFromPageDirImages from './features/generateTagsFromPageDirImages'
import { extendTypes } from './kit'

export interface ModuleOptions {
  /**
   * Whether the SEO experiements should run.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Should the files in the public directory be used to infer tags.
   *
   * @default true
   */
  metaDataFiles: boolean
  /**
   * Should head data be inferred from the current input to fill in the gaps.
   *
   * For example:
   * - If you supply a title, this will automatically add an og:title.
   * - If you provide an og:image, it will automatically add a twitter:image.
   *
   * @default true
   */
  automaticOgAndTwitterTags: boolean
  /**
   * Attempts to treeshake the `useSeoMeta` function.
   *
   * Can save around 5kb in the client bundle.
   *
   * @default true
   */
  treeShakeUseSeoMeta: boolean
  mergeWithSiteConfig: boolean

  extendRouteRules: boolean

  fixRequiredAbsoluteMetaTagsLinks: boolean

  extendNuxtConfigAppHeadSeoMeta: boolean

  extendNuxtConfigAppHeadTypes: boolean

  setupNuxtConfigAppHeadWithMoreDefaults: boolean

  /**
   * Enables debug logs and a debug endpoint.
   *
   * @default false
   */
  debug: boolean
  // deprecations
  /**
   * Whether meta tags should be optimised for SEO.
   *
   * @deprecated Use `inferTagsFromFiles` instead.
   */
  seoOptimise?: boolean
  /**
   * @deprecated Use `automaticTagsFromFiles` instead.
   */
  inferTagsFromFiles?: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-seo-experiments',
    configKey: 'seoExperiments',
    compatibility: {
      nuxt: '>=3.6.1',
      bridge: false,
    },
  },
  defaults: {
    enabled: true,
    debug: false,
    metaDataFiles: true,
    mergeWithSiteConfig: true,
    extendRouteRules: true,
    fixRequiredAbsoluteMetaTagsLinks: true,
    extendNuxtConfigAppHeadSeoMeta: true,
    treeShakeUseSeoMeta: true,
    extendNuxtConfigAppHeadTypes: true,
    setupNuxtConfigAppHeadWithMoreDefaults: true,
    automaticOgAndTwitterTags: true,
  },
  async setup(config, nuxt) {
    const logger = useLogger('nuxt-seo-experiments')
    logger.level = (config.debug || nuxt.options.debug) ? 4 : 3
    if (config.enabled === false) {
      logger.debug('The module is disabled, skipping setup.')
      return
    }
    const { resolve } = createResolver(import.meta.url)
    await installNuxtSiteConfig()

    if (config.metaDataFiles) {
      // we need ssr to resolve the tags to the absolute path
      await generateTagsFromPublicFiles()
      await generateTagsFromPageDirImages()

      if (nuxt.options.dev) {
        addServerHandler({
          handler: resolve('runtime/nitro/middleware/resolveImagesInPagesDir'),
        })
      }
    }

    if (config.extendNuxtConfigAppHeadSeoMeta)
      extendNuxtConfigAppHeadSeoMeta()

    if (config.setupNuxtConfigAppHeadWithMoreDefaults)
      setupNuxtConfigAppHeadWithMoreDefaults(nuxt)

    if (config.extendNuxtConfigAppHeadTypes)
      extendNuxtConfigAppHeadTypes()

    // add types for the route rules
    extendTypes('nuxt-seo-experiments', async () => {
      // route rules and app config
      return `
declare module 'nitropack' {
  interface NitroRouteRules {
     seoMeta?: import('@unhead/schema').UseSeoMetaInput
     head?: import('@unhead/schema').Head
  }
  interface NitroRouteConfig {
    seoMeta?: import('@unhead/schema').UseSeoMetaInput
    head?: import('@unhead/schema').Head
  }
}

declare module '@nuxt/schema' {
  interface NuxtAppConfig { seoMeta?: import('@unhead/schema').UseSeoMetaInput }
  interface NuxtConfig { app?: ConfigSchema['app'] & { seoMeta?: import('@unhead/schema').UseSeoMetaInput } }
  interface NuxtOptions { app: ConfigSchema['app'] & { seoMeta?: import('@unhead/schema').UseSeoMetaInput } }
}

declare module 'nuxt/schema' {
  interface NuxtAppConfig { seoMeta?: import('@unhead/schema').UseSeoMetaInput }
  interface NuxtConfig { app?: import('@nuxt/schema').ConfigSchema['app'] & { seoMeta?: import('@unhead/schema').UseSeoMetaInput } }
  interface NuxtOptions { app: import('@nuxt/schema').ConfigSchema['app'] & { seoMeta?: import('@unhead/schema').UseSeoMetaInput } }
}
`
    })

    const runtimeDir = resolve('./runtime/nuxt')
    // remove useServerHead in client build
    if (config.treeShakeUseSeoMeta)
      addVitePlugin(UnheadVite())
    if (config.automaticOgAndTwitterTags)
      addPlugin({ src: resolve(runtimeDir, 'plugins', 'inferSeoMetaPlugin') })

    if (config.mergeWithSiteConfig)
      addPlugin({ src: resolve(runtimeDir, 'plugins', 'siteConfig') })

    if (config.extendRouteRules)
      addPlugin({ src: resolve(runtimeDir, 'plugins', '0.routeRules.server'), mode: 'server' })

    if (config.fixRequiredAbsoluteMetaTagsLinks)
      addPlugin({ src: resolve(runtimeDir, 'plugins', '1.absoluteImageUrls.server'), mode: 'server' })
  },
})
