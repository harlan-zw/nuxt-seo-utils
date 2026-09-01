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
  rootDir: resolve('../fixtures/no-i18n'),
  nuxtConfig: {
    // @ts-expect-error module config key
    seo: {
      extendNuxtConfigAppHeadSeoMeta: false,
      meta: {
        'og:image': [undefined],
      },
    },
  },
})

describe('validateAppHead with malformed seo.meta', () => {
  it('skips the check instead of failing the build', () => {
    expect(logs.join('\n')).toContain('Skipped the head config check.')
  })
})
