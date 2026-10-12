import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createResolver } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)
const rootDir = resolve('../fixtures/static-redirects')
const nuxtBin = resolve('../../node_modules/.bin/nuxt')

/**
 * Run `nuxt generate` on the fixture, which holds the `seo.redirects` entries, and return the build log.
 * Each build runs in its own process: Nitro imports the prerender server by a fixed path, and Node caches that import.
 */
async function generate(preset: string, baseURL = '/'): Promise<string> {
  const { stdout, stderr } = await promisify(execFile)(nuxtBin, ['generate', rootDir], {
    env: { ...process.env, NITRO_PRESET: preset, NUXT_APP_BASE_URL: baseURL },
    maxBuffer: 16 * 1024 * 1024,
  })
  return stdout + stderr
}

// eslint-disable-next-line harlanzw/no-test-file-reads -- the files that `nuxt generate` writes are the behaviour under test
const read = (path: string) => readFileSync(join(rootDir, path), 'utf8')
/** The `_redirects` lines, with each run of whitespace as one space. */
const redirectLines = (path: string) => read(path).split('\n').map(line => line.trim().split(/\s+/).join(' '))
const metaRefreshPages = (publicDir: string) => ['old-about/index.html', 'old-about.html'].filter(file => existsSync(join(rootDir, publicDir, file)))

describe('seo.redirects on static hosts', () => {
  it('writes Netlify `_redirects` rules with 410 for gone URLs, and no meta refresh pages', async () => {
    const log = await generate('netlify-static')
    const rules = redirectLines('dist/_redirects')
    expect(rules).toEqual(expect.arrayContaining([
      '/old-about /about 301',
      // Netlify has no 308, so Nitro writes 301
      '/old-home / 301',
      '/legacy/* /admin/:splat 301',
      '/legacy /admin 301',
      '/docs /manual 301',
      '/docs/* /handbook/:splat 301',
      '/elsewhere https://example.org/page 301',
      '/shop/best-seller /about 301',
      '/shop/* /404.html 410',
      '/shop /404.html 410',
      '/spring-sale /404.html 410',
    ]))
    // The first matching line wins, so an exact entry comes before a prefix that covers it
    expect(rules.indexOf('/shop/best-seller /about 301')).toBeLessThan(rules.indexOf('/shop/* /404.html 410'))
    expect(rules.indexOf('/docs /manual 301')).toBeLessThan(rules.indexOf('/docs/* /handbook/:splat 301'))
    expect(rules).not.toContain('/docs /handbook 301')
    expect(rules.indexOf('/spring-sale /404.html 410')).toBeLessThan(rules.indexOf('/* /404.html 404'))
    expect(metaRefreshPages('dist')).toEqual([])
    expect(log).not.toContain('cannot')
  }, 120_000)

  it('writes Cloudflare Pages `_redirects` rules under app.baseURL and lists the 410 entries it cannot serve', async () => {
    const log = await generate('cloudflare-pages-static', '/base')
    const rules = redirectLines('dist/_redirects')
    expect(rules).toEqual(expect.arrayContaining([
      '/base/old-about /base/about 301',
      '/base/old-home /base/ 308',
      '/base/legacy/* /base/admin/:splat 301',
      '/base/legacy /base/admin 301',
      '/base/docs /base/manual 301',
      '/base/docs/* /base/handbook/:splat 301',
      '/base/elsewhere https://example.org/page 301',
      '/base/shop/best-seller /base/about 301',
    ]))
    expect(rules.indexOf('/base/docs /base/manual 301')).toBeLessThan(rules.indexOf('/base/docs/* /base/handbook/:splat 301'))
    expect(rules.filter(rule => /^\/base\/(?:spring-sale|shop) |^\/base\/shop\/\* /.test(rule))).toEqual([])
    expect(metaRefreshPages('dist/base')).toEqual([])
    expect(log).toContain('Cloudflare Pages cannot send 410 from `_redirects`. These gone URLs return the host 404 page instead:\n  - /shop/**\n  - /spring-sale')
  }, 120_000)

  it('adds Vercel routes under app.baseURL, with 410 for gone URLs', async () => {
    const log = await generate('vercel-static', '/base')
    const { routes } = JSON.parse(read('.vercel/output/config.json')) as { routes: Record<string, unknown>[] }
    const moved = (src: string, status: number, location: string) => ({ src, status, headers: { 'Location': location, 'cache-control': 'public, max-age=3600' } })
    const gone = (src: string) => ({ src, status: 410, dest: '/base/404.html' })
    // Every redirect sits before the filesystem phase
    expect(routes.slice(0, routes.findIndex(route => route.handle === 'filesystem'))).toEqual(expect.arrayContaining([
      moved('^/base/old-about/?$', 301, '/base/about'),
      moved('^/base/old-home/?$', 308, '/base/'),
      moved('^/base/elsewhere/?$', 301, 'https://example.org/page'),
      moved('^/base/shop/best-seller/?$', 301, '/base/about'),
      gone('^/base/spring-sale/?$'),
      moved('^/base/legacy/?$', 301, '/base/admin'),
      moved('^/base/docs/?$', 301, '/base/manual'),
      gone('^/base/shop/?$'),
      moved('^/base/legacy/(.*)$', 301, '/base/admin/$1'),
      moved('^/base/docs/(.*)$', 301, '/base/handbook/$1'),
      gone('^/base/shop/(.*)$'),
    ]))
    // Routes match top down, so an exact entry comes before a prefix that covers it
    const index = (src: string) => routes.findIndex(route => route.src === src)
    expect(index('^/base/shop/best-seller/?$')).toBeLessThan(index('^/base/shop/(.*)$'))
    expect(index('^/base/legacy/?$')).toBeLessThan(index('^/base/legacy/(.*)$'))
    expect(index('^/base/docs/?$')).toBeLessThan(index('^/base/docs/(.*)$'))
    expect(metaRefreshPages('.vercel/output/static/base')).toEqual([])
    expect(log).not.toContain('cannot')
  }, 120_000)

  it('keeps meta refresh pages on Netlify under app.baseURL, where Netlify does not read the Nitro `_redirects` file', async () => {
    const log = await generate('netlify-static', '/base')
    expect(metaRefreshPages('dist/base')).toEqual(['old-about/index.html'])
    expect(read('dist/base/old-about/index.html')).toContain('url=/base/about')
    expect(read('dist/base/_redirects')).not.toContain('old-about')
    expect(log).toContain('These entries need host redirect rules, or they return the host 404 page:\n  - /legacy/**')
  }, 120_000)
})
