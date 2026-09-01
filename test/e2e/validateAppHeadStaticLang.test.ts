import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

const logs: string[] = []
const restore = [process.stdout, process.stderr].map((stream) => {
  const write = stream.write.bind(stream)
  stream.write = ((chunk: unknown, ...args: unknown[]) => {
    logs.push(String(chunk))
    return write(chunk as never, ...(args as never[]))
  }) as typeof stream.write
  return () => {
    stream.write = write
  }
})

await setup({
  rootDir: resolve('../fixtures/static-lang'),
})

// setup() builds inside a beforeAll hook, so keep the streams patched until the suite ends
afterAll(() => restore.forEach(reset => reset()))

describe('validateAppHead with i18n installed but unconfigured', () => {
  it('flags a static lang as a locale mismatch, not an i18n conflict', () => {
    expect(logs.join('\n')).toContain(`defaultLocale: 'fr'`)
  })
})
