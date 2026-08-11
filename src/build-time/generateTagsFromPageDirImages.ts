import type { Nuxt } from '@nuxt/schema'
import fs from 'node:fs'
import { useNuxt } from '@nuxt/kit'
import { defu } from 'defu'
import { basename, dirname, resolve } from 'pathe'
import { glob } from 'tinyglobby'
import { joinURL } from 'ufo'
import { isMetaTagFile, MetaTagFileDeepGlobs } from '../const'
import { generateNuxtPageFromFile } from '../pageUtils'
import { getImageMeta } from '../util'
import { classifyIconFilename } from './iconAssets'

const DIR_SUFFIX_RE = /\/_dir$/

interface GeneratedRouteRule {
  head: {
    link: Array<Record<string, string | undefined>>
  }
  seoMeta: Record<string, Array<Record<string, unknown>>>
}

function addGeneratedRouteRule(nuxt: Nuxt, route: string, generatedRule: GeneratedRouteRule): void {
  nuxt.options.routeRules ||= {}
  nuxt.options.nitro.routeRules ||= {}
  const routeRules = nuxt.options.routeRules as unknown as Record<string, Record<string, unknown> | undefined>
  const rule = structuredClone(generatedRule) as unknown as Record<string, unknown>
  routeRules[route] = defu(routeRules[route], rule)

  const nitroRouteRules = nuxt.options.nitro.routeRules as unknown as Record<string, Record<string, unknown> | undefined>
  if (nitroRouteRules !== routeRules)
    nitroRouteRules[route] = defu(nitroRouteRules[route], structuredClone(rule))
}

export default async function generateTagsFromPageDirImages(nuxt: Nuxt = useNuxt()): Promise<void> {
  const pagesDirs = nuxt.options._layers
    .map(layer => resolve(layer.config.rootDir!, layer.config.dir?.pages || 'pages'))
    .filter(dir => fs.existsSync(dir))

  const appendRouteRules: Record<string, GeneratedRouteRule> = {}
  const registeredFiles = new Set<string>()
  const devMiddlewareMap: Record<string, string> = {}
  const nitroOutputMap: { src: string, dest: string }[] = []

  for (const pagesDir of pagesDirs) {
    const files = (await glob(MetaTagFileDeepGlobs, { cwd: pagesDir, onlyFiles: true }))
      .filter(file => isMetaTagFile(basename(file)))

    for (const file of files) {
      const fileName = basename(file)
      const keyword = fileName.split('.')[0] || ''
      let { path } = generateNuxtPageFromFile(resolve(pagesDir, dirname(file)), pagesDir)
      if (path.endsWith('/_dir'))
        path = path.replace(DIR_SUFFIX_RE, '')

      const registrationKey = `${path}:${fileName}`
      if (registeredFiles.has(registrationKey))
        continue
      registeredFiles.add(registrationKey)

      const routeAssetPath = joinURL(path, fileName)
      const href = joinURL(nuxt.options.app.baseURL, routeAssetPath)
      const iconRel = classifyIconFilename(fileName)
      const meta = await getImageMeta(pagesDir, file, iconRel !== undefined)
      const routeRule = appendRouteRules[path] ||= { head: { link: [] }, seoMeta: {} }

      if (iconRel) {
        routeRule.head.link.push({
          rel: iconRel,
          type: String(meta.type),
          href,
          sizes: String(meta.sizes),
          media: meta.media ? String(meta.media) : undefined,
        })
      }
      else {
        const property = ['opengraph-image', 'og-image'].includes(keyword) ? 'ogImage' : 'twitterImage'
        routeRule.seoMeta[property] ||= []
        routeRule.seoMeta[property].push({ url: href, ...meta, sizes: undefined })
      }
      devMiddlewareMap[routeAssetPath] = resolve(pagesDir, file)
      nitroOutputMap.push({
        src: resolve(pagesDir, file),
        dest: routeAssetPath.slice(1),
      })
    }
  }

  for (const [route, rule] of Object.entries(appendRouteRules)) {
    addGeneratedRouteRule(nuxt, route, rule)
    if (route !== '/')
      addGeneratedRouteRule(nuxt, `${route}/**`, rule)
  }

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
