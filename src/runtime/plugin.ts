import { injectHead } from '@vueuse/head'
import { InferSeoMetaPlugin } from '@unhead/addons'
import { defineNuxtPlugin, useRuntimeConfig } from '#app'
import { ogDescriptionTemplate, ogTitleTemplate, resolveAliases, seoOptimise } from '#nuxt-unhead/config'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin
const resolveAliasProps = ['href', 'src']

function processTitleTemplateTokens(s: string, config: { titleSeparator: string } & Record<string, string>) {
  // for each %<word> token replace it with the corresponding runtime config or an empty value
  const replacer = (preserveToken?: boolean) => (_: unknown, token: string) => {
    if (token === 'pageTitle' || token === 's')
      return '%s'

    let val
    // support . notation
    if (token.includes('.')) {
      // @ts-expect-error untyped
      val = token.split('.').reduce((acc, key) => acc[key] || {}, config)
    }
    else {
      val = config[token]
    }
    return val || (preserveToken ? token : '')
  }
  let template = s
    .replace(/%(\w+\.?\w+)%/g, replacer())
    .replace(/%(\w+\.?\w+)/g, replacer(true))
    .trim()

  if (config.titleSeparator) {
    // avoid the title ending with a separator
    if (template.endsWith(config.titleSeparator))
      template = template.slice(0, -config.titleSeparator.length).trim()
    if (template.startsWith(config.titleSeparator))
      template = template.slice(config.titleSeparator.length).trim()
  }
  return template
}

export default defineNuxtPlugin(() => {
  const head = injectHead()
  const config = useRuntimeConfig().public

  if (!head)
    return

  if (seoOptimise) {
    head.use(
      InferSeoMetaPlugin({
        robots: false,
        ogTitle: processTitleTemplateTokens(ogTitleTemplate, config),
        ogDescription: processTitleTemplateTokens(ogDescriptionTemplate, config),
      }),
    )
  }

  head.hooks.hook('tag:normalise', async ({ tag }) => {
    if (['titleTemplate', 'title'].includes(tag.tag) && tag.children)
      tag.children = processTitleTemplateTokens(tag.children, config)
    if (tag.tag === 'meta' && tag.props.content)
      tag.props.content = processTitleTemplateTokens(tag.props.content, config)
  })

  if (config.titleSeparator) {
    // in case the page title was null, we need to strip the separator
    head.hooks.hook('tags:resolve', async ({ tags }) => {
      for (const tag of tags) {
        if (tag.tag === 'title' && tag.children) {
          // trim
          tag.children = tag.children.trim()
          // avoid the title ending with a separator
          if (tag.children.endsWith(config.titleSeparator))
            tag.children = tag.children.slice(0, -config.titleSeparator.length).trim()
          if (tag.children.startsWith(config.titleSeparator))
            tag.children = tag.children.slice(config.titleSeparator.length).trim()
        }
      }
    })
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
