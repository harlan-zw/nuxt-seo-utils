import type { ColorModeIconLinks } from '../../types'
import { defineNuxtPlugin, useHead, useNuxtApp, useRuntimeConfig } from '#imports'
import { selectColorModeIconLinks } from '../logic/colorModeIcons'

interface ColorModeState {
  value: string
}

export default defineNuxtPlugin({
  name: 'nuxt-seo-utils:color-mode-icons',
  enforce: 'post',
  setup() {
    const runtimeConfig = useRuntimeConfig()
    const seoConfig = runtimeConfig.public['seo-utils'] as { colorModeIcons?: ColorModeIconLinks }
    const colorMode = useNuxtApp().$colorMode as ColorModeState | undefined
    const icons = seoConfig.colorModeIcons
    if (!icons || !colorMode)
      return

    useHead(() => ({
      link: selectColorModeIconLinks(icons, colorMode.value),
    }))
  },
})
