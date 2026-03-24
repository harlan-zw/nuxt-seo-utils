import type { Nuxt } from 'nuxt/schema'
import { useNuxt } from '@nuxt/kit'
import { setupDevToolsUI as _setupDevToolsUI } from 'nuxtseo-shared/devtools'

export function setupDevToolsUI(resolve: (path: string) => string, nuxt: Nuxt = useNuxt()) {
  _setupDevToolsUI({
    route: '/__nuxt-seo-utils',
    name: 'nuxt-seo-utils',
    title: 'SEO Utils',
    icon: 'carbon:search-locate',
  }, resolve, nuxt)
}
