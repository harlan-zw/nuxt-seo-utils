import { injectHead, useNuxtApp } from 'nuxt/app'
import { shapes } from '#nuxt-seo-utils/compiled-head'
import { compiledHeadShapes } from '../../shared/compiledHeadShapes'
import { useFallbackTitle } from '../composables/useFallbackTitle'
import { chooseShape, pushChosenHead } from './compiledHead'

/** The fallback title under compiler mode. Its priority of 101 sits inside the compiled tags. */
export function applyCompiledFallbackTitle(): void {
  const title = useFallbackTitle()
  pushChosenHead(useNuxtApp(), injectHead() as any, () => {
    const value = title.value
    return chooseShape(shapes?.fallbackTitle, [value], () => compiledHeadShapes.fallbackTitle(value))
  })
}
