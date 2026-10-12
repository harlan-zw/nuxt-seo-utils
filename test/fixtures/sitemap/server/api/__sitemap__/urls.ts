import { defineEventHandler } from 'nuxt/server'

// A CMS that still lists a moved page and a deleted page.
export default defineEventHandler(() => [
  '/old-post',
  '/spring-sale',
  '/new-post',
  '/about',
])
