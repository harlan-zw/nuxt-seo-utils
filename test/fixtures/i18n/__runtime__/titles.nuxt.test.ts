// @vitest-environment nuxt
import { describe, expect, it, vi } from 'vitest'
import { useRouter } from '#imports'

describe('fallback titles with i18n', () => {
  it('resolves pages.<route>.title from the plugin', async () => {
    const router = useRouter()
    await router.push('/about')
    // the about page sets no title itself, the plugin must resolve pages.about.title
    await vi.waitFor(() => {
      expect(document.title).toContain('About us (i18n)')
    })
  })

  it('resolves pages.<route>.title for the prefixed locale', async () => {
    const router = useRouter()
    await router.push('/fr/about')
    await vi.waitFor(() => {
      expect(document.title).toContain('À propos (i18n)')
    })
  })

  it.each([
    ['a|b', 'A|b'],
    ['{foo}', '{foo}'],
    ['foo}', 'Foo}'],
    ['@harlan', '@harlan'],
  ])('keeps literal fallback title for path segment %s without compiling vue-i18n syntax', async (segment, expectedTitle) => {
    const router = useRouter()
    await router.push(`/docs/${segment}`)
    await vi.waitFor(() => {
      expect(document.title).toContain(expectedTitle)
    })
  })
})
