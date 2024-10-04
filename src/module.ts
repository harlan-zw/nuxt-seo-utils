import {
  addImports,
  addPlugin,
  addServerHandler,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
  useLogger,
} from '@nuxt/kit'
import UnheadVite from '@unhead/addons/vite'
import { installNuxtSiteConfig } from 'nuxt-site-config-kit'
import extendNuxtConfigAppHeadSeoMeta from './build-time/extendNuxtConfigAppHeadSeoMeta'
import extendNuxtConfigAppHeadTypes from './build-time/extendNuxtConfigAppHeadTypes'
import generateTagsFromPageDirImages from './build-time/generateTagsFromPageDirImages'
import generateTagsFromPublicFiles from './build-time/generateTagsFromPublicFiles'
import setupNuxtConfigAppHeadWithMoreDefaults from './build-time/setupNuxtConfigAppHeadWithMoreDefaults'
import { extendTypes } from './kit'

export interface ModuleOptions {
  /**
   * Whether the SEO experiements should run.
   *
   * @default true
   */
  enabled: boolean
  /**
   * Should the files in the public directory be used to infer tags such as favicon, apple-touch-icon, and
   * open graph images.
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
   * Attempts to treeshake the `useSeoMeta` function. Can save around 5kb in the client bundle.
   *
   * @default true
   */
  treeShakeUseSeoMeta: boolean
  /**
   * Injects site config into the `useHead` composable such as setting the title template
   *
   * @default true
   */
  mergeWithSiteConfig: boolean
  /**
   * Adds `head` and `seoMeta` to the route rules and app config.
   *
   * @default true
   */
  extendRouteRules: boolean
  /**
   * Tries to convert relative image paths to absolute paths in meta tags.
   *
   * @default true
   */
  fixRequiredAbsoluteMetaTagsLinks: boolean
  /**
   * Extends the `head` in the Nuxt config with the `seoMeta` object.
   *
   * @default true
   */
  extendNuxtConfigAppHeadSeoMeta: boolean
  /**
   * Augments the head schema with `/public` files making it easier to reference them in the head.
   *
   * @default true
   */
  extendNuxtConfigAppHeadTypes: boolean
  /**
   * @dead
   */
  setupNuxtConfigAppHeadWithMoreDefaults: boolean

  /**
   * Will ensure a title is always set by providing a fallback title based on the casing the last slug segment.
   *
   * @default true
   */
  fallbackTitle?: boolean
  /**
   * Will set up a number of defaults for meta tags and Schema.org, if the modules and config are available.
   *
   * @default true
   */
  automaticDefaults?: boolean
  /**
   * When enabled, it will whitelist the query parameters that are allowed in the canonical URL.
   */
  canonicalQueryWhitelist?: string[]
  /**
   * When enabled, it will redirect any request to the canonical domain (site url) using a 301 redirect on non-dev environments.
   *
   * E.g if the site url is 'www.example.com' and the user visits 'example.com',
   * they will be redirected to 'www.example.com'.
   *
   * This is useful for SEO as it prevents duplicate content and consolidates page rank.
   *
   * @default false
   */
  redirectToCanonicalSiteUrl?: boolean

  /**
   * Enables debug logs and a debug endpoint.
   *
   * @default false
   */
  debug: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-seo-utils',
    configKey: 'seo',
    compatibility: {
      nuxt: '>=3.6.1',
      bridge: false,
    },
  },
  defaults: {
    enabled: true,
    debug: false,
    redirectToCanonicalSiteUrl: false,
    automaticDefaults: true,
    fallbackTitle: true,
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
    const logger = useLogger('nuxt-seo-utils')
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
          middleware: true,
          handler: resolve('runtime/nitro/middleware/resolveImagesInPagesDir.dev'),
        })
      }
    }

    if (config.automaticDefaults) {
      // i18n complicates things, we need to run the server plugin at the right time, client is fine
      if (hasNuxtModule('@nuxtjs/i18n')) {
        addPlugin({
          src: resolve(`./runtime/nuxt/plugins/defaultsWaitI18n`),
        })
      }
      else {
        addPlugin({
          src: resolve(`./runtime/nuxt/plugins/defaults`),
        })
      }
    }
    if (config.fallbackTitle) {
      addPlugin({
        src: resolve('./runtime/nuxt/plugins/titles'),
      })
    }

    if (!hasNuxtModule('@nuxtjs/i18n')) {
      addImports({
        from: resolve(`./runtime/nuxt/composables/polyfills`),
        name: 'useI18n',
      })
    }

    addImports({
      from: resolve(`./runtime/nuxt/composables/useBreadcrumbItems`),
      name: 'useBreadcrumbItems',
    })

    // TODO blocked by https://github.com/nuxt/nuxt/issues/25532
    // if (nuxt.options.experimental?.defaults?.nuxtLink && typeof nuxt.options.experimental?.defaults?.nuxtLink?.trailingSlash == 'undefined')
    //   nuxt.options.experimental.defaults.nuxtLink.trailingSlash = siteConfig.trailingSlash ? 'append' : 'remove'

    // if user disables certain modules we need to pollyfill the imports
    const polyfills = [
      // @ts-expect-error runtime type
      ...((!hasNuxtModule('nuxt-schema-org') || nuxt.options.schemaOrg?.enable === false)
        ? [
            'useSchemaOrg',
            'defineWebSite',
            'defineWebPage',
            'defineBreadcrumb',
          ]
        : []),
    ]
    polyfills.forEach((name) => {
      // add pollyfill
      addImports({
        from: resolve('./runtime/nuxt/composables/polyfills'),
        name,
      })
    })
    nuxt.options.experimental.headNext = true

    // add redirect middleware
    if (!nuxt.options.dev && config.redirectToCanonicalSiteUrl) {
      addServerHandler({
        handler: resolve('./runtime/nitro/middleware/redirect'),
        middleware: true,
      })
    }

    nuxt.options.runtimeConfig.public['nuxt-seo'] = {
      canonicalQueryWhitelist: config.canonicalQueryWhitelist || [
        'page',
        'sort',
        'filter',
        'search',
        'q',
        'category',
        'tag',
      ],
    }

    if (config.extendNuxtConfigAppHeadSeoMeta)
      extendNuxtConfigAppHeadSeoMeta()

    if (config.setupNuxtConfigAppHeadWithMoreDefaults)
      setupNuxtConfigAppHeadWithMoreDefaults(nuxt)

    if (config.extendNuxtConfigAppHeadTypes)
      extendNuxtConfigAppHeadTypes()

    // add types for the route rules
    extendTypes('nuxt-seo-utils', async () => {
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
  interface MetaObjectRaw { seoMeta?: import('@unhead/schema').UseSeoMetaInput }
}

declare module 'nuxt/schema' {
  interface MetaObjectRaw { seoMeta?: import('@unhead/schema').UseSeoMetaInput }
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
