import type { Nuxt } from '@nuxt/schema'
import type { UseSeoMetaInput } from '@unhead/schema'
import fs from 'node:fs'
import { useNuxt } from '@nuxt/kit'
import { defu } from 'defu'
import fg from 'fast-glob'
import { basename, dirname, resolve } from 'pathe'
import { joinURL } from 'ufo'
import { MetaTagFileGlobs } from '../const'
import { generateNuxtPageFromFile } from '../pageUtils'
import { getImageMeta } from '../util'

export default async function generateTagsFromPageDirImages(nuxt: Nuxt = useNuxt()) {
  // @todo support layer public dirs
  const pagesDir = resolve(nuxt.options.rootDir, nuxt.options.dir.pages)

  // within the pages folder, we need to find all images
  const files = (await fg(MetaTagFileGlobs, { cwd: pagesDir, onlyFiles: true }))

  const appendRouteRules: Record<string, any> = {}
  const devMiddlewareMap: Record<string, string> = {}
  const nitroOutputMap: { src: string, dest: string }[] = []
  for (const file of files) {
    const fileName = basename(file)
    const keyword = fileName.split('.')[0]
    // for the page file we'll need to figure out what the actual route is
    // const route = file.replace(/\/(og|icon|apple-icon)\.png$/, '')
    let { path } = generateNuxtPageFromFile(resolve(pagesDir, dirname(file)), pagesDir)
    const meta = await getImageMeta(pagesDir, file)
    // if the path ends with _dir/<filename> then we can omit the _dir
    if (path.endsWith('/_dir'))
      path = path.replace(/\/_dir$/, '')

    const src = joinURL(path, fileName)
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
      dest: src.slice(1), // remove leading slash
    })
  }

  nuxt.options.routeRules = defu(appendRouteRules, nuxt.options.routeRules)
  nuxt.options.nitro.routeRules = defu(appendRouteRules, nuxt.options.nitro.routeRules)

  if (nuxt.options.dev) {
    // add a virtual nitro file to expose the file mapping
    nuxt.hooks.hook('nitro:config', async (nitroConfig) => {
      nitroConfig.virtual!['#nuxt-seo-utils/pageDirImages'] = `export const fileMapping = ${JSON.stringify(devMiddlewareMap)}`
    })
  }

  nuxt.hooks.hook('nitro:build:public-assets', (_nitro) => {
    // dump the file mapping to the public dir output folder
    const publicDir = resolve(_nitro.options.output.dir, _nitro.options.output.publicDir)
    nitroOutputMap.forEach(({ src, dest }) => {
      const resolvedDest = resolve(publicDir, dest)
      const destFolder = dirname(resolvedDest)
      // ensure dir
      if (!fs.existsSync(destFolder))
        fs.mkdirSync(destFolder, { recursive: true })

      // make sure dest doesn't exist already
      if (!fs.existsSync(resolvedDest))
        fs.copyFileSync(src, resolvedDest)
    })
  })
}
