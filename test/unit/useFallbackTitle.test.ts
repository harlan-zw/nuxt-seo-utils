import { useError, useRoute } from 'nuxt/app'
import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useFallbackTitle } from '../../src/runtime/app/composables/useFallbackTitle'

vi.mock('nuxt/app', () => ({
  useRoute: vi.fn(),
  useError: vi.fn(),
}))

vi.mock('scule', () => ({
  titleCase: (s: string) => s.charAt(0).toUpperCase() + s.slice(1),
}))

describe('useFallbackTitle', () => {
  it('returns error title for 404', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/', meta: {} } as any)
    vi.mocked(useError).mockReturnValue(ref({ statusCode: 404, message: 'Page not found' }) as any)

    const title = useFallbackTitle()
    expect(title.value).toBe('404 - Page not found')
  })

  it('returns error title for 500', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/', meta: {} } as any)
    vi.mocked(useError).mockReturnValue(ref({ statusCode: 500, message: 'Internal Server Error' }) as any)

    const title = useFallbackTitle()
    expect(title.value).toBe('500 - Internal Server Error')
  })

  it('returns route.meta.title when set', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/about', meta: { title: 'About Us' } } as any)
    vi.mocked(useError).mockReturnValue(ref(null) as any)

    const title = useFallbackTitle()
    expect(title.value).toBe('About Us')
  })

  it('title-cases the last URL segment as fallback', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/blog/my-post', meta: {} } as any)
    vi.mocked(useError).mockReturnValue(ref(null) as any)

    const title = useFallbackTitle()
    expect(title.value).toBe('My-post')
  })

  it('returns null for root path', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/', meta: {} } as any)
    vi.mocked(useError).mockReturnValue(ref(null) as any)

    const title = useFallbackTitle()
    expect(title.value).toBeNull()
  })

  it('strips trailing slash before extracting segment', () => {
    vi.mocked(useRoute).mockReturnValue({ path: '/contact/', meta: {} } as any)
    vi.mocked(useError).mockReturnValue(ref(null) as any)

    const title = useFallbackTitle()
    expect(title.value).toBe('Contact')
  })
})
