import fs from 'node:fs'
import { parseURL } from 'ufo'
import { setHeader } from 'h3'
import { defineEventHandler } from '#imports'
import { fileMapping } from '#nuxt-seo-experiments/pageDirImages'

export default defineEventHandler(async (e) => {
  const path = parseURL(e.path).pathname
  if (fileMapping[path]) {
    // add correct header for path type
    if (path.endsWith('.svg'))
      setHeader(e, 'Content-Type', 'image/svg+xml')
    else if (path.endsWith('.png'))
      setHeader(e, 'Content-Type', 'image/png')
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg'))
      setHeader(e, 'Content-Type', 'image/jpeg')

    return fs.readFileSync(fileMapping[path])
  }
})
