import type { Nuxt } from '@nuxt/schema'
import type { UseSeoMetaInput } from '@unhead/vue/types'
import fs from 'node:fs'
import { useNuxt } from '@nuxt/kit'
import { defu } from 'defu'
import { basename, dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { joinURL } from 'ufo'
import { MetaTagFileDeepGlobs } from '../const'
import { generateNuxtPageFromFile } from '../pageUtils'
import { getImageMeta } from '../util'

const DIR_SUFFIX_RE = /\/_dir$/

export default async function generateTagsFromPageDirImages(nuxt: Nuxt = useNuxt()): Promise<void> {
  const pagesDirs = nuxt.options._layers
    .map(layer => resolve(layer.config.rootDir!, layer.config.dir?.pages || 'pages'))
    .filter(dir => fs.existsSync(dir))

  const appendRouteRules: Record<string, any> = {}
  const devMiddlewareMap: Record<string, string> = {}
  const nitroOutputMap: { src: string, dest: string }[] = []

  for (const pagesDir of pagesDirs) {
    const files = await glob(MetaTagFileDeepGlobs, { cwd: pagesDir, onlyFiles: true })

    for (const file of files) {
      const fileName = basename(file)
      const keyword = fileName.split('.')[0] || ''
      let { path } = generateNuxtPageFromFile(resolve(pagesDir, dirname(file)), pagesDir)
      const meta = await getImageMeta(pagesDir, file)
      if (path.endsWith('/_dir'))
        path = path.replace(DIR_SUFFIX_RE, '')

      const src = joinURL(path, fileName)
      // skip if a higher-priority layer already registered this route
      if (appendRouteRules[`${path}/**`])
        continue

      if (['icon', 'apple-touch-icon', 'apple-icon'].includes(keyword) || keyword.startsWith('icon-')) {
        appendRouteRules[`${path}/**`] = {
          head: {
            link: [
              { rel: keyword, type: meta.type, href: src, sizes: meta.sizes },
            ],
          },
        }
      }
      else {
        appendRouteRules[`${path}/**`] = {
          seoMeta: <UseSeoMetaInput> {
            [['opengraph-image', 'og-image'].includes(keyword) ? 'ogImage' : 'twitterImage']: [{ url: src, ...meta, sizes: undefined }],
          },
        }
      }
      devMiddlewareMap[src] = resolve(pagesDir, file)
      nitroOutputMap.push({
        src: resolve(pagesDir, file),
        dest: src.slice(1),
      })
    }
  }

  nuxt.options.routeRules = defu(appendRouteRules, nuxt.options.routeRules)
  nuxt.options.nitro.routeRules = defu(appendRouteRules, nuxt.options.nitro.routeRules)

  if (nuxt.options.dev) {
    nuxt.hooks.hook('nitro:config', async (nitroConfig) => {
      nitroConfig.virtual!['#seo-utils-virtual/pageDirImages'] = `export const fileMapping = ${JSON.stringify(devMiddlewareMap)}`
    })
  }

  nuxt.hooks.hook('nitro:build:public-assets', (_nitro) => {
    const publicDir = resolve(_nitro.options.output.dir, _nitro.options.output.publicDir)
    nitroOutputMap.forEach(({ src, dest }) => {
      const resolvedDest = resolve(publicDir, dest)
      const destFolder = dirname(resolvedDest)
      if (!fs.existsSync(destFolder))
        fs.mkdirSync(destFolder, { recursive: true })
      if (!fs.existsSync(resolvedDest))
        fs.copyFileSync(src, resolvedDest)
    })
  })
}
