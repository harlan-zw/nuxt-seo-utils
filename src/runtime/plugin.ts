import { packMeta } from 'zhead'
import { defineNuxtPlugin } from '#app'
// @ts-expect-error untyped
import options from '#build/nuxt-hedge-config.mjs'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin

export default defineNuxtPlugin((nuxtApp) => {
  const { resolveAliases, seoOptimise } = options

  const head = nuxtApp.vueApp._context.provides.usehead

  head.hooks['resolved:tags'].push(async (tags) => {
    await nuxtApp.hooks.callHook('head:tags', tags)
  })

  head.hooks['resolved:entries'].push(async (entries) => {
    await nuxtApp.hooks.callHook('head:entries', entries)
  })


  // @todo get this to work in v1
  if (resolveAliases) {
    head.hooks['resolved:tags'].push(async (tags) => {
      // resolve runtime build aliases
      const props = ['href', 'src']
      for (const i in tags) {
        for (const prop of props) {
          if (tags[i]?.props?.[prop] && /^[~@]+\//.test(tags[i].props[prop])) {
            // Note: This could work but we need this hook to be async or to be able to resolve promises as values
            if (process.server) {
              tags[i].props[prop] = (await import(/* @vite-ignore */ `${tags[i].props[prop]}?url`)).default
            }
            else {
              // Note: client side does not work
              // @todo need to figure out a way to opt-out of the hydration of a tag
            }
          }
        }
      }
    })
  }

  if (seoOptimise) {
    head.hooks['resolved:tags'].push((tags) => {
      const metaProps = []
      let title = ''
      for (const i in tags) {
        if (tags[i].tag === 'meta' && Object.keys(tags[i].props).length)
          metaProps.push(tags[i].props)
        if (tags[i].tag === 'title')
          title = tags[i].children
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
})
