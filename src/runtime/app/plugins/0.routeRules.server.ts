import { injectHead } from '#imports'
import { unpackMeta } from '@unhead/vue/utils'
import { defineNuxtPlugin, useRequestEvent } from 'nuxt/app'

export default defineNuxtPlugin({
  enforce: 'post',
  async setup() {
    const head = injectHead()
    if (!head)
      return

    const event = useRequestEvent()

    if (event.context._nitro.routeRules.head)
      head.push(event.context._nitro.routeRules.head, { mode: 'server', tagPriority: -9 })

    if (event.context._nitro.routeRules.seoMeta) {
      const meta = unpackMeta({ ...event.context._nitro.routeRules.seoMeta })
      head.push({
        meta,
      }, { mode: 'server', tagPriority: -9 })
    }
  },
})
