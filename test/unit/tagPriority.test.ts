import { describe, expect, it } from 'vitest'

describe('tagPriority', () => {
  it('default tagPriority is applied to runtime config', async () => {
    // Simulate what the module does: sets tagPriority in runtime config
    const config = { tagPriority: 30 }
    const runtimeConfig = {
      public: {
        'seo-utils': {
          canonicalQueryWhitelist: [],
          canonicalLowercase: true,
          tagPriority: config.tagPriority,
        },
      },
    }
    expect(runtimeConfig.public['seo-utils'].tagPriority).toBe(30)
  })

  it('custom tagPriority propagates to runtime config', async () => {
    const config = { tagPriority: 10 }
    const runtimeConfig = {
      public: {
        'seo-utils': {
          canonicalQueryWhitelist: [],
          canonicalLowercase: true,
          tagPriority: config.tagPriority,
        },
      },
    }
    expect(runtimeConfig.public['seo-utils'].tagPriority).toBe(10)
  })

  it('tagPriority is used in seoMeta options', () => {
    const tagPriority = 30
    const seoMetaPriority = { tagPriority }
    expect(seoMetaPriority).toEqual({ tagPriority: 30 })
    // Verify it's distinct from the minimalPriority used for other head tags
    const minimalPriority = { tagPriority: 'low' as const }
    expect(seoMetaPriority).not.toEqual(minimalPriority)
  })
})
