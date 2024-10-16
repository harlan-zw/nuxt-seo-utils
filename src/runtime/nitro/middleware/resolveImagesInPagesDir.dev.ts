import fs from 'node:fs'
import { defineEventHandler } from '#imports'
import { fileMapping } from '#nuxt-seo-utils/pageDirImages'
import { setHeader } from 'h3'
import { parseURL } from 'ufo'

// Note: this only runs in dev
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
