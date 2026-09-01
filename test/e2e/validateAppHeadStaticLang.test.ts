import { createResolver } from '@nuxt/kit'
import { setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const { resolve } = createResolver(import.meta.url)

const logs: string[] = []
for (const stream of [process.stdout, process.stderr]) {
  const write = stream.write.bind(stream)
  stream.write = ((chunk: unknown, ...args: unknown[]) => {
    logs.push(String(chunk))
    return write(chunk as never, ...(args as never[]))
  }) as typeof stream.write
}

await setup({
  rootDir: resolve('../fixtures/basic'),
})

describe('validateAppHead with i18n installed but unconfigured', () => {
  it('flags a static lang as a locale mismatch, not an i18n conflict', () => {
    expect(logs.join('\n')).toContain(`defaultLocale: 'fr'`)
  })
})
