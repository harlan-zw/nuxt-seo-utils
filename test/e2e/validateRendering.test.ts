import type { Nuxt, NuxtConfig } from '@nuxt/schema'
import { createResolver, loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { resolve } = createResolver(import.meta.url)
let nuxt: Nuxt | undefined

afterEach(async () => {
  await nuxt?.close()
  nuxt = undefined
  vi.restoreAllMocks()
})

async function warnings(overrides: NuxtConfig, dev = true) {
  const logs: string[] = []
  for (const stream of [process.stdout, process.stderr]) {
    vi.spyOn(stream, 'write').mockImplementation(((chunk: unknown) => {
      logs.push(String(chunk))
      return true
    }) as typeof stream.write)
  }
  nuxt = await loadNuxt({
    cwd: resolve('../fixtures/no-i18n'),
    dev,
    ready: true,
    overrides: {
      ...overrides,
      seo: { metaDataFiles: false, validateAppHead: false, ...overrides.seo },
    },
  })
  return logs.join('\n')
}

describe('rendering configuration lifecycle', () => {
  it.each([true, false])('warns for global client rendering with dev=%s', async (dev) => {
    const output = await warnings({ ssr: false }, dev)
    expect(output).toContain('Rendering configuration issues:')
    expect(output).toContain('SSR is disabled for indexable pages matching `/**`')
    expect(output).toContain('Enable SSR for public pages.')
    expect(output).toContain('`robots: false`')
    expect(output).not.toContain('issue in your Nuxt config head')
  })

  it('uses the final Nitro rules after other module hooks', async () => {
    const output = await warnings({
      routeRules: { '/app/**': { ssr: false }, '/public/**': { ssr: false } },
      hooks: {
        'nitro:config': (config) => {
          config.routeRules!['/app/**'] = { ssr: false, robots: { indexable: false, rule: 'noindex, nofollow' } } as never
        },
      },
    })
    expect(output).toContain('indexable pages matching `/public/**`')
    expect(output).not.toContain('indexable pages matching `/app/**`')
  })

  it('warns when prerender and route SSR overrides cannot restore global SSR', async () => {
    const output = await warnings({
      ssr: false,
      routeRules: { '/**': { ssr: true, prerender: true } },
    })
    expect(output).toContain('indexable pages matching `/**`')
  })

  it.each([
    { site: { indexable: false } },
    { robots: { indexable: false } },
    { routeRules: { '/**': { robots: false } } },
    { seo: { enabled: false } },
    { _prepare: true },
  ])('respects explicit exclusion: %j', async (config) => {
    const output = await warnings({ ssr: false, ...config } as NuxtConfig)
    expect(output).not.toContain('Rendering configuration issues:')
  })
})
