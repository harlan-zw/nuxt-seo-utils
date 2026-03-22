import type { Nuxt } from 'nuxt/schema'
import { existsSync } from 'node:fs'
import { addCustomTab } from '@nuxt/devtools-kit'
import { useNuxt } from '@nuxt/kit'

const DEVTOOLS_UI_ROUTE = '/__nuxt-seo-utils'
const DEVTOOLS_UI_LOCAL_PORT = 3031

export function setupDevToolsUI(resolve: (path: string) => string, nuxt: Nuxt = useNuxt()) {
  const clientPath = resolve('./client')
  const isProductionBuild = existsSync(clientPath)

  if (isProductionBuild) {
    nuxt.hook('vite:serverCreated', async (server) => {
      const sirv = await import('sirv').then(r => r.default || r)
      server.middlewares.use(
        DEVTOOLS_UI_ROUTE,
        sirv(clientPath, { dev: true, single: true }),
      )
    })
  }
  else {
    nuxt.hook('vite:extendConfig', (config) => {
      config.server ||= {}
      ;(config.server as any).proxy ||= {}
      config.server!.proxy![DEVTOOLS_UI_ROUTE] = {
        target: `http://localhost:${DEVTOOLS_UI_LOCAL_PORT}${DEVTOOLS_UI_ROUTE}`,
        changeOrigin: true,
        followRedirects: true,
        rewrite: path => path.replace(DEVTOOLS_UI_ROUTE, ''),
      }
    })
  }

  addCustomTab({
    name: 'nuxt-seo-utils',
    title: 'SEO Utils',
    icon: 'carbon:search-locate',
    view: {
      type: 'iframe',
      src: DEVTOOLS_UI_ROUTE,
    },
  })
}
