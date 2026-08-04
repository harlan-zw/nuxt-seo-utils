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

assert.equal(nitroManifest.versions.nitro, '3.0.260610-beta')
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
  const html = await response.text()
  assert.match(html, /Nuxt SEO Utils Nitro 3/)
  assert.match(html, /Nuxt 5 compatible SEO utils/)

  const debug = await fetch(`${origin}/__nuxt-seo-utils/debug.json`).then(response => response.json())
  assert.equal(debug.siteConfig.name, 'Nuxt 5 SEO Utils')
  assert.equal(debug.siteConfig.url, 'https://nuxt5.example.com')
}
finally {
  server.kill()
  if (server.exitCode === null)
    await new Promise(resolve => server.once('exit', resolve))
}
