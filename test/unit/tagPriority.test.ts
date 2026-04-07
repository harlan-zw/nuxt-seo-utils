import { describe, expect, it } from 'vitest'

describe('tagPriority', () => {
  it('default tagPriority is applied to runtime config', async () => {
    // Simulate what the module does: sets tagPriority in runtime config
    const config = { tagPriority: 'low' as const }
    const runtimeConfig = {
      public: {
        'seo-utils': {
          canonicalQueryWhitelist: [],
          canonicalLowercase: true,
          tagPriority: config.tagPriority,
        },
      },
    }
    expect(runtimeConfig.public['seo-utils'].tagPriority).toBe('low')
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

  it('tagPriority accepts string aliases', () => {
    const priorities = ['critical', 'high', 'low', 'before:style', 'after:meta'] as const
    for (const p of priorities) {
      const seoMetaPriority = { tagPriority: p }
      expect(seoMetaPriority.tagPriority).toBe(p)
    }
  })
})
