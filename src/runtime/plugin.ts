import { injectHead } from '@vueuse/head'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'

export default defineNuxtPlugin(() => {
  const head = injectHead()
  const config = useRuntimeConfig().public

  if (!head)
    return

  const { ogDescriptionTemplate, ogTitleTemplate, resolveAliases, seoOptimise } = config['nuxt-unhead']

  if (seoOptimise) {
    head.use(
      InferSeoMetaPlugin({
        robots: false,
        ogTitle: ogTitleTemplate,
        ogDescription: ogDescriptionTemplate,
      }),
    )
  }

  const separator = config.separator || config.titleSeparator || '|'
  head.push({
    templateParams: {
      // @ts-expect-error untyped
      ...config,
      // @ts-expect-error untyped
      separator,
      // @ts-expect-error untyped
      titleSeparator,
    },
  })

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
