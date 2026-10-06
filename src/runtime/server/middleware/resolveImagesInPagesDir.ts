import fs from 'node:fs'
import { defineEventHandler } from 'nuxt/server'
import { fileMapping } from '#seo-utils-virtual/pageDirImages'

// Note: this only runs in dev
export default defineEventHandler(async (e) => {
  const path = e.url.pathname
  if (fileMapping[path]) {
    // add correct header for path type
    if (path.endsWith('.svg'))
      e.res.headers.set('Content-Type', 'image/svg+xml')
    else if (path.endsWith('.png'))
      e.res.headers.set('Content-Type', 'image/png')
    else if (path.endsWith('.jpg') || path.endsWith('.jpeg'))
      e.res.headers.set('Content-Type', 'image/jpeg')

    return fs.readFileSync(fileMapping[path])
  }
})
