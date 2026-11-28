// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { useBreadcrumbItems, useNuxtApp, useRouter } from '#imports'

describe('useBreadcrumbItems with i18n', () => {
  it.each([
    ['a|b', 'A|b'],
    ['{foo}', '{Foo}'],
    ['foo}', 'Foo}'],
    ['@harlan', '@Harlan'],
    ['foo@bar', 'Foo@bar'],
  ])('keeps literal fallback label for path segment %s without compiling vue-i18n syntax', async (segment, expectedLabel) => {
    const router = useRouter()
    await router.push(`/docs/${segment}`)
    const items = useBreadcrumbItems()
    const leaf = items.value.at(-1)
    expect(leaf?.label).toBe(expectedLabel)
    expect(leaf?.ariaLabel).toBe(expectedLabel)
  })

  it('resolves translated breadcrumb keys for the active locale', async () => {
    const router = useRouter()
    await router.push('/fr/about')
    const items = useBreadcrumbItems()
    expect(items.value[0]?.label).toBe('Accueil')
    expect(items.value[1]?.label).toBe('About')
  })

  it('resolves translated breadcrumb keys from the fallback locale', async () => {
    const i18n = useNuxtApp().$i18n
    const prevFallback = i18n.fallbackLocale.value
    i18n.mergeLocaleMessage('en', {
      breadcrumb: {
        items: {
          about: {
            label: 'About Fallback',
            ariaLabel: 'About Fallback Aria',
          },
        },
      },
    })
    i18n.fallbackLocale.value = 'en'
    try {
      const router = useRouter()
      await router.push('/fr/about')
      const items = useBreadcrumbItems()
      expect(items.value[1]?.label).toBe('About Fallback')
      expect(items.value[1]?.ariaLabel).toBe('About Fallback Aria')
    }
    finally {
      i18n.fallbackLocale.value = prevFallback
    }
  })
})
