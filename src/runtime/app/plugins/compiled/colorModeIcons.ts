import { defineNuxtPlugin, injectHead, useNuxtApp } from 'nuxt/app'
import { colorModeIcons } from '#nuxt-seo-utils/compiled-head'
import { pushChosenHead } from '../../logic/compiledHead'

interface ColorModeState {
  value: string
}

// The color mode icons plugin under compiler mode: the compiled tags of the app color mode.
export default defineNuxtPlugin({
  name: 'nuxt-seo-utils:color-mode-icons',
  enforce: 'post',
  setup(nuxtApp) {
    const head = injectHead()
    const colorMode = useNuxtApp().$colorMode as ColorModeState | undefined
    if (!head || !colorMode || !colorModeIcons)
      return
    pushChosenHead(nuxtApp, head as any, () => ({ _tag: 'Compiled', tags: colorMode.value === 'dark' ? colorModeIcons!.dark : colorModeIcons!.light, values: [] }))
  },
})
