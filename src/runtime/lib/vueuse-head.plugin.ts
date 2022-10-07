import { createHead, renderHeadToString } from '@vueuse/head'
import type { HeadEntryOptions } from '@vueuse/head'
import { defineNuxtPlugin, useRouter } from '#app'
import { packMeta } from 'zhead'
import type { MetaObject } from '@nuxt/schema'
import { getCurrentInstance, onBeforeUnmount, watchEffect, isRef } from 'vue'
// @ts-expect-error untyped
import options from '#build/nuxt-hedge-config.mjs'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin

export default defineNuxtPlugin((nuxtApp) => {
  const { resolveAliases, seoOptimise } = options
  const head = createHead()

  nuxtApp.vueApp.use(head)

  // @todo get this to work in v1
  if (resolveAliases) {
    // promise hooks are not supported in < v1
    head.hookTagsResolved.push(async (tags) => {
      // resolve runtime build aliases
      const props = ['href', 'src']
      for (const i in tags) {
        for (const prop of props) {
          if (tags[i]?.props?.[prop] && /^[~@]+\//.test(tags[i].props[prop])) {
            // Note: This could work but we need this hook to be async or to be able to resolve promises as values
            if (process.server) {
              tags[i].props[prop] = await import(/* @vite-ignore */ `${tags[i].props[prop]}?url`)
            }
            else {
              // remove this tag
              tags.splice(i, 1)
            }
          }
        }
      }
    })
  }

  if (seoOptimise) {
    head.hookTagsResolved.push((tags) => {
      const metaProps = []
      let title = ''
      for (const i in tags) {
        if (tags[i].tag === 'meta')
          metaProps.push(tags[i].props)
        if (tags[i].tag === 'title')
          title = tags[i].props.textContent
      }
      const meta = packMeta(metaProps)
      // ensure twitter card is set
      if (meta.ogImage && !meta.twitterCard) {
        tags.push({
          tag: 'meta',
          props: {
            name: 'twitter:card',
            content: 'summary_large_image',
          },
        })
      }

      // ensure og:title
      if (title && !meta.ogTitle) {
        tags.push({
          tag: 'meta',
          props: {
            name: 'og:title',
            content: title,
          },
        })
      }

      // ensure og:description
      if (meta.description && !meta.ogDescription) {
        tags.push({
          tag: 'meta',
          props: {
            name: 'og:description',
            content: meta.description,
          },
        })
      }
    })
  }

  let pauseDOMUpdates = true
  head.hookBeforeDomUpdate.push(() => !pauseDOMUpdates)
  nuxtApp.hooks.hookOnce('app:mounted', () => {
    pauseDOMUpdates = false
    head.updateDOM()

    // start pausing DOM updates when route changes (trigger immediately)
    useRouter().beforeEach(() => {
      pauseDOMUpdates = true
    })
    // watch for new route before unpausing dom updates (triggered after suspense resolved)
    useRouter().afterEach(() => {
      pauseDOMUpdates = false
      head.updateDOM()
    })
  })

  nuxtApp._useHead = (_meta: MetaObject, options: HeadEntryOptions) => {
    const removeSideEffectFns = []

    // only support shortcuts if it's a plain object (avoids ref packing / unpacking)
    if (!isRef(_meta) && typeof _meta === 'object') {
      const shortcutMeta = []
      if (_meta.charset) {
        shortcutMeta.push({
          charset: _meta.charset,
        })
      }
      if (_meta.viewport) {
        shortcutMeta.push({
          name: 'viewport',
          content: _meta.viewport,
        })
      }
      if (shortcutMeta.length) {
        removeSideEffectFns.push(head.addHeadObjs({
          meta: shortcutMeta,
        }))
      }
    }

    removeSideEffectFns.push(head.addHeadObjs(_meta, options))

    if (process.server)
      return

    // will happen next tick
    watchEffect(() => {
      head.updateDOM()
    })

    const vm = getCurrentInstance()
    if (!vm)
      return

    onBeforeUnmount(() => {
      removeSideEffectFns.forEach(fn => fn())
      head.updateDOM()
    })
  }

  if (process.server) {
    nuxtApp.ssrContext!.renderMeta = () => {
      const meta = renderHeadToString(head)
      return {
        ...meta,
        // resolves naming difference with NuxtMeta and @vueuse/head
        bodyScripts: meta.bodyTags,
      }
    }
  }
})
