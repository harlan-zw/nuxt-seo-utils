import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFile, readdir } from 'node:fs/promises'
import { createServer } from 'node:net'
import { resolve } from 'node:path'

const portServer = createServer()
portServer.listen(0, '127.0.0.1')
await once(portServer, 'listening')
const port = portServer.address().port
portServer.close()
await once(portServer, 'close')

const origin = `http://127.0.0.1:${port}`
const nitroManifest = JSON.parse(await readFile(new URL('.output/nitro.json', import.meta.url), 'utf8'))
const nitroServerEntries = await readdir(new URL('.output/server', import.meta.url), {
  recursive: true,
  withFileTypes: true,
})
const nitroServer = (await Promise.all(
  nitroServerEntries
    .filter(entry => entry.isFile() && entry.name.endsWith('.mjs'))
    .map(entry => readFile(resolve(entry.parentPath, entry.name), 'utf8')),
)).join('\n')

assert.match(nitroManifest.versions.nitro, process.env.NUXT_TEST_LANE === 'nuxt5' ? /^3\./ : /^2\./)
if (process.env.NUXT_TEST_LANE === 'nuxt5')
  assert.doesNotMatch(nitroServer, /nitropack\/runtime/)

const server = spawn(process.execPath, ['.output/server/index.mjs'], {
  cwd: import.meta.dirname,
  env: {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
  },
  stdio: 'inherit',
})

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null)
      throw new Error(`Nuxt 5 server exited with code ${server.exitCode}`)

    const response = await fetch(origin, {
      signal: AbortSignal.timeout(1_000),
    }).catch(() => null)
    if (response?.ok)
      return response

    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error('Nuxt 5 server did not start')
}

try {
  const response = await waitForServer()
  assert.equal((await (await fetch(`${origin}/api/runtime-alias`)).json()).enabled, true)
  const html = await response.text()
  assert.match(html, /href="https:\/\/x\.com\/intent\/tweet\?/)
  assert.match(html, /Nuxt SEO Utils Nitro 3/)
  assert.match(html, /Nuxt 5 compatible SEO utils/)
  assert.match(html, /Nuxt 5 SEO Utils/)
  assert.match(html, /<meta(?=[^>]*property="og:title")(?=[^>]*content="Nuxt 5 SEO Utils")[^>]*>/)
  assert.match(html, /<meta(?=[^>]*property="og:description")(?=[^>]*content="Nuxt 5 compatible SEO utils")[^>]*>/)
  assert.doesNotMatch(html, /application\/ld\+json/)

  const debug = await fetch(`${origin}/__nuxt-seo-utils/debug.json`).then(response => response.json())
  assert.equal(debug.siteConfig.name, 'Nuxt 5 SEO Utils')
  assert.equal(debug.siteConfig.url, 'https://nuxt5.example.com')
}
finally {
  server.kill()
  if (server.exitCode === null)
    await new Promise(resolve => server.once('exit', resolve))
}
