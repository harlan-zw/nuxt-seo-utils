import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { buildNuxt, createResolver, loadNuxt } from '@nuxt/kit'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Nuxt 4.6 under compatibilityVersion 5 defines no `defineAppConfig` in the server bundle.
// The canonical redirect middleware must not pull app.config.ts into it, or the server
// throws while it starts.
const { resolve } = createResolver(import.meta.url)
const rootDir = resolve('../fixtures/compat5-canonical')

let origin = ''
let stopServer = () => {}

/** Start the built server on a free port and resolve its origin, or reject with its error output. */
async function startServer(): Promise<string> {
  const server = spawn(process.execPath, [resolve(rootDir, '.output/server/index.mjs')], {
    env: { ...process.env, PORT: '0', NITRO_PORT: '0', HOST: '127.0.0.1', NITRO_HOST: '127.0.0.1' },
  })
  stopServer = () => server.kill()
  let output = ''
  server.stderr.on('data', (chunk) => {
    output += chunk
  })
  const listening = new Promise<string>((resolveOrigin) => {
    server.stdout.on('data', (chunk) => {
      output += chunk
      const port = /Listening on .*:(\d+)/.exec(output)?.[1]
      if (port)
        resolveOrigin(`http://127.0.0.1:${port}`)
    })
  })
  const exited = once(server, 'exit').then(([code]) => {
    throw new Error(`The server exited with code ${code}:\n${output}`)
  })
  return Promise.race([listening, exited])
}

describe('redirectToCanonicalSiteUrl with compatibilityVersion 5', () => {
  beforeAll(async () => {
    const nuxt = await loadNuxt({ cwd: rootDir })
    await buildNuxt(nuxt)
    origin = await startServer()
  }, 180000)

  afterAll(() => stopServer())

  it('serves the page on the canonical host', async () => {
    const res = await fetch(`${origin}/`, { headers: { 'x-forwarded-host': 'example.com' }, redirect: 'manual' })
    expect(res.status).toBe(200)
    expect(await res.text()).toContain('<div>emerald</div>')
  })

  it('redirects another host to the site URL', async () => {
    // `/` is prerendered and served as a static file, so request a rendered path.
    const res = await fetch(`${origin}/about?ref=1`, { headers: { 'x-forwarded-host': 'other.example' }, redirect: 'manual' })
    expect(res.status).toBe(301)
    expect(res.headers.get('location')).toBe('https://example.com/about?ref=1')
  })
})
