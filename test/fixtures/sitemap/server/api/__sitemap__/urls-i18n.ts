import { defineEventHandler } from 'nuxt/server'

// The same CMS list, with a French copy of every URL.
export default defineEventHandler(() => ['', '/fr'].flatMap(prefix => [
  `${prefix}/old-post`,
  `${prefix}/spring-sale`,
  `${prefix}/new-post`,
  `${prefix}/about`,
]))
