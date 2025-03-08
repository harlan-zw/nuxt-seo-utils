import type { UseSeoMetaInput } from '@unhead/schema'
import {
  addImports,
  addPlugin,
  addServerHandler,
  addVitePlugin,
  createResolver,
  defineNuxtModule,
  hasNuxtModule,
  resolvePath,
  useLogger,
} from '@nuxt/kit'
import UnheadVite from '@unhead/addons/vite'
import { defu } from 'defu'
import { installNuxtSiteConfig } from 'nuxt-site-config/kit'
import { dirname, join, relative } from 'pathe'
import { readPackageJSON } from 'pkg-types'
import { gte } from 'semver'
import extendNuxtConfigAppHeadSeoMeta from './build-time/extendNuxtConfigAppHeadSeoMeta'
import extendNuxtConfigAppHeadTypes from './build-time/extendNuxtConfigAppHeadTypes'
import generateTagsFromPageDirImages from './build-time/generateTagsFromPageDirImages'
import generateTagsFromPublicFiles from './build-time/generateTagsFromPublicFiles'
import setupNuxtConfigAppHeadWithMoreDefaults from './build-time/setupNuxtConfigAppHeadWithMoreDefaults'
import { extendTypes } from './kit'
import { resolveUnpackMeta } from './util'

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
   * When enabled, it will lowercase the canonical URL.
   *
   * @default true
   */
  canonicalLowercase?: boolean
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
   * The SEO meta object to be used as defaults.
   */
  meta: UseSeoMetaInput

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
    canonicalLowercase: true,
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

    let isUnheadV2 = false
    const unheadPath = await resolvePath('@unhead/vue')
      .catch(() => undefined)
      // compatibility
      .then(p => p?.endsWith('index.mjs') ? dirname(p) : p)
    // couldn't be found for some reason, assume compatibility
    if (unheadPath) {
      const { version: unheadVersion } = await readPackageJSON(join(unheadPath, 'package.json'))
      if (gte(unheadVersion!, '2.0.0-rc.1')) {
        isUnheadV2 = true
      }
    }

    const runtimeDir = isUnheadV2 ? resolve('./runtime/unhead-v2') : './runtime/unhead-v1'
    const unpackMeta = await resolveUnpackMeta(isUnheadV2)
    if (config.metaDataFiles) {
      // we need ssr to resolve the tags to the absolute path
      await generateTagsFromPublicFiles(unpackMeta)
      await generateTagsFromPageDirImages()

      if (nuxt.options.dev) {
        addServerHandler({
          middleware: true,
          handler: resolve(runtimeDir, 'server/middleware/resolveImagesInPagesDir'),
        })
      }
    }

    const hasI18n = hasNuxtModule('@nuxtjs/i18n') || hasNuxtModule('nuxt-i18n-micro')
    if (config.automaticDefaults) {
      // i18n complicates things, we need to run the server plugin at the right time, client is fine
      if (hasI18n) {
        addPlugin({
          src: resolve(runtimeDir, `./app/plugins/defaultsWaitI18n`),
        })
      }
      else {
        addPlugin({
          src: resolve(runtimeDir, `./app/plugins/defaults`),
        })
      }
    }
    if (config.fallbackTitle) {
      addPlugin({
        src: resolve(runtimeDir, './app/plugins/titles'),
      })
    }

    if (!hasI18n) {
      addImports({
        from: resolve(runtimeDir, `./app/composables/polyfills`),
        name: 'useI18n',
      })
    }

    addImports({
      from: resolve(runtimeDir, `./app/composables/useBreadcrumbItems`),
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
        from: resolve(runtimeDir, './app/composables/polyfills'),
        name,
      })
    })
    nuxt.options.experimental.headNext = true

    // add redirect middleware
    if (!nuxt.options.dev && config.redirectToCanonicalSiteUrl) {
      addServerHandler({
        handler: resolve(runtimeDir, './server/middleware/redirectCanonical'),
        middleware: true,
      })
    }
    nuxt.options.alias['#seo-utils'] = runtimeDir
    nuxt.options.runtimeConfig.public['seo-utils'] = defu(nuxt.options.runtimeConfig.public['seo-utils'] || {}, {
      canonicalQueryWhitelist: config.canonicalQueryWhitelist || [
        'page',
        'sort',
        'filter',
        'search',
        'q',
        'category',
        'tag',
      ],
      canonicalLowercase: config.canonicalLowercase,
    })

    if (config.extendNuxtConfigAppHeadSeoMeta)
      extendNuxtConfigAppHeadSeoMeta(unpackMeta)

    if (config.setupNuxtConfigAppHeadWithMoreDefaults)
      setupNuxtConfigAppHeadWithMoreDefaults(nuxt)

    if (config.extendNuxtConfigAppHeadTypes)
      extendNuxtConfigAppHeadTypes()

    // add types for the route rules
    extendTypes('nuxt-seo-utils', async () => {
      const pkg = isUnheadV2 ? '@unhead/vue/types' : '@unhead/schema'
      let unheadSchemaPath: string
      try {
        unheadSchemaPath = relative(resolve(nuxt!.options.rootDir, nuxt!.options.buildDir, 'module'), await resolvePath(pkg))
      }
      catch {
        unheadSchemaPath = pkg
      }
      // route rules and app config
      return `
declare module 'nitropack' {
  interface NitroRouteRules {
     seoMeta?: import('${unheadSchemaPath}').UseSeoMetaInput
     head?: import('${unheadSchemaPath}').Head
  }
  interface NitroRouteConfig {
    seoMeta?: import('${unheadSchemaPath}').UseSeoMetaInput
    head?: import('${unheadSchemaPath}').Head
  }
}

declare module '@nuxt/schema' {
  interface AppHeadMetaObject { seoMeta?: import('${unheadSchemaPath}').UseSeoMetaInput }
}

declare module 'nuxt/schema' {
  interface AppHeadMetaObject { seoMeta?: import('${unheadSchemaPath}').UseSeoMetaInput }
}
`
    })

    const appRuntimeDir = resolve(runtimeDir, './app')
    // remove useServerHead in client build
    if (config.treeShakeUseSeoMeta)
      addVitePlugin(UnheadVite())
    if (config.automaticOgAndTwitterTags)
      addPlugin({ src: resolve(appRuntimeDir, 'plugins', 'inferSeoMetaPlugin') })

    if (config.mergeWithSiteConfig)
      addPlugin({ src: resolve(appRuntimeDir, 'plugins', 'siteConfig') })

    if (config.extendRouteRules)
      addPlugin({ src: resolve(appRuntimeDir, 'plugins', '0.routeRules.server'), mode: 'server' })

    if (config.fixRequiredAbsoluteMetaTagsLinks)
      addPlugin({ src: resolve(appRuntimeDir, 'plugins', '1.absoluteImageUrls.server'), mode: 'server' })
  },
})
