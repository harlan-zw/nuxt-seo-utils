import type { Link } from '@unhead/vue/types'
import type { ColorModeIconLinks } from '../../types'

export function selectColorModeIconLinks(icons: ColorModeIconLinks, colorMode: string): Link[] {
  const selected = colorMode === 'dark' ? icons.dark : icons.light
  return selected.map((link, index) => ({
    ...link,
    key: `nuxt-seo-utils:color-mode-icon:${getLinkKey(link, index)}`,
  }))
}

function getLinkKey(link: Link, index: number): string {
  return `${link.rel}:${index}`
}
