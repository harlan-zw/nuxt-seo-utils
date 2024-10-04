import { useRequestEvent } from '#imports'
import { unpackMeta } from '@unhead/shared'
import { injectHead } from '@unhead/vue'
import { defineNuxtPlugin } from 'nuxt/app'

export default defineNuxtPlugin({
  enforce: 'post',
  async setup() {
    const head = injectHead()
    if (!head)
      return

    const event = useRequestEvent()

    if (event.context._nitro.routeRules.head)
      head.push(event.context._nitro.routeRules.head, { mode: 'server' })

    if (event.context._nitro.routeRules.seoMeta) {
      const meta = unpackMeta({ ...event.context._nitro.routeRules.seoMeta })
      head.push({
        meta,
      }, { mode: 'server' })
    }
  },
})
