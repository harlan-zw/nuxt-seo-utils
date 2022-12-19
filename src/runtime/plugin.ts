import { injectHead } from '@vueuse/head'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin } from '#app'
// @ts-expect-error untyped
import options from '#build/nuxt-unhead-config.mjs'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin
const resolveAliasProps = ['href', 'src']

export default defineNuxtPlugin((nuxtApp) => {
  const { resolveAliases, seoOptimise } = options

  const head = injectHead()

  if (!head)
    return

  if (seoOptimise) {
    head.use(InferSeoMetaPlugin({
      robots: false,
      ogTitle: options.ogTitleTemplate || '%s',
      ogDescription: options.ogDescriptionTemplate || '%s',
    }))
  }

  if (resolveAliases) {
    head.hooks.hook('tags:resolve', async (ctx) => {
      const validTags = []
      // allow users to resolve vite aliasing using href and src
      for (const tag of ctx.tags) {
        let isValid = true
        for (const prop of resolveAliasProps) {
          if (!tag.props[prop] || !(tag.props?.[prop] && /^[~@]+\//.test(tag.props[prop])))
            continue

          if (process.server) {
            let moduleUrl = tag.props[prop]
            try {
              moduleUrl = (await import(/* @vite-ignore */ `${tag.props[prop]}?url`)).default
            }
            catch (e) {}
            tag.props[prop] = moduleUrl
          }
          else { isValid = false }
        }
        if (isValid)
          validTags.push(tag)
      }

      // filter out aliases
      ctx.tags = validTags
    })
  }
})
