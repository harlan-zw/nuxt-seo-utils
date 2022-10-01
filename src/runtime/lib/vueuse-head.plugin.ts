import { createHead, renderHeadToString } from '@vueuse/head'
import { defineNuxtPlugin } from '#app'
import { defu } from 'defu'
import { MetaObject, UseHeadInput } from '../../types'
import { watchEffect, onBeforeUnmount, getCurrentInstance } from '#build/imports'

// Note: This should always be a partial match to nuxt's internal vueuse-head plugin

export default defineNuxtPlugin((nuxtApp) => {
  if (nuxtApp.vueApp._context.provides.usehead) {
    return
  }

  const head = createHead()

  nuxtApp.vueApp.use(head)

  let headReady = false
  nuxtApp.hooks.hookOnce('app:mounted', () => {
    watchEffect(() => { head.updateDOM() })
    headReady = true
  })

  let pauseDOMUpdates = true
  head.hookBeforeDomUpdate.push(() => !pauseDOMUpdates)

  nuxtApp.hooks.hookOnce('page:finish', () => {
    pauseDOMUpdates = false
    // start pausing DOM updates when route changes (trigger immediately)
    useRouter().beforeEach(() => {
      pauseDOMUpdates = true
    })

    // watch for new route before unpausing dom updates (triggered after suspense resolved)
    watch(useRoute(), () => {
      pauseDOMUpdates = false
    })
  })

  nuxtApp._useHead = (_meta: UseHeadInput) => {
    const meta = ref<MetaObject>(_meta)
    const headObj = computed(() => {
      const overrides: MetaObject = { meta: [] }
      if (meta.value.charset) {
        overrides.meta.push({
          key: 'charset',
          charset: meta.value.charset
        })
      }
      if (meta.value.viewport) {
        overrides.meta.push({
          name: 'viewport',
          content: meta.value.viewport
        })
      }
      return defu(overrides, meta.value)
    })

    head.addHeadObjs(headObj)

    if (process.server) { return }

    if (headReady) {
      watchEffect(() => { head.updateDOM() })
    }

    const vm = getCurrentInstance()
    if (!vm) { return }

    onBeforeUnmount(() => {
      head.removeHeadObjs(headObj)
      head.updateDOM()
    })
  }

  if (process.server) {
    nuxtApp.ssrContext!.renderMeta = () => {
      const meta = renderHeadToString(head)
      return {
        ...meta,
        // resolves naming difference with NuxtMeta and @vueuse/head
        bodyScripts: meta.bodyTags
      }
    }
  }
})
