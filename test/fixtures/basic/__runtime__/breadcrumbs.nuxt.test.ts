// @vitest-environment nuxt
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toValue } from 'vue'
import { useBreadcrumbItems } from '../../../../src/runtime/app/composables/useBreadcrumbItems'

const { useRouterMock, useRouteMock, useI18nMock, useSchemaOrgMock, defineBreadcrumbMock } = vi.hoisted(() => {
  return {
    useI18nMock: vi.fn().mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          if (s === 'breadcrumb.items.about.label') {
            return 'About I18n'
          }
          return fallback
        }),
      }
    }),
    useRouteMock: vi.fn().mockImplementation(() => {
      return {
        path: '/',
      }
    }),
    useRouterMock: vi.fn().mockImplementation(() => {
      return {
        resolve: vi.fn().mockImplementation((s: string) => {
          if (s === '/') {
            return { matched: [{ name: 'index', title: 'Home' }] }
          }
          return { matched: [{ name: 'unknown' }] }
        }),
        currentRoute: {
          value: {
            path: '/',
          },
        },
      }
    }),
    useSchemaOrgMock: vi.fn().mockImplementation((args) => {
      return args
    }),
    defineBreadcrumbMock: vi.fn().mockImplementation((args) => {
      return args
    }),
  }
})

mockNuxtImport('useRouter', () => {
  return useRouterMock
})
mockNuxtImport('useRoute', () => {
  return useRouteMock
})
mockNuxtImport('useI18n', () => {
  return useI18nMock
})
mockNuxtImport('useSchemaOrg', () => {
  return useSchemaOrgMock
})
mockNuxtImport('defineBreadcrumb', () => {
  return defineBreadcrumbMock
})

function mockCurrentPath(path: string, matched?: any) {
  useRouterMock.mockImplementation(() => {
    return {
      currentRoute: {
        value: {
          path,
        },
      },
      resolve(s: string) {
        if (s === '/') {
          return { matched: [{ name: 'index' }] }
        }
        if (matched.path?.includes('.*')) {
          return { matched: [matched] }
        }
        if (s === path) {
          return { matched: [matched] }
        }
        return { matched: [{ name: 'index' }] }
      },
    }
  })
  useRouteMock.mockImplementation(() => {
    return {
      path,
    }
  })
}

afterEach(() => {
  vi.resetAllMocks()
})

describe('useBreadcrumbItems', () => {
  it('home', async () => {
    const breadcrumbs = useBreadcrumbItems()
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
    [
      {
        "ariaLabel": "Home",
        "current": true,
        "label": "Home",
        "to": "/",
      },
    ]
  `)
  })
  it('subpath', async () => {
    mockCurrentPath('/subpath', { name: 'subpath', title: 'My subpath' })
    useI18nMock.mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          return fallback
        }),
      }
    })
    const breadcrumbs = useBreadcrumbItems()
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
      [
        {
          "ariaLabel": "Home",
          "current": false,
          "label": "Home",
          "to": "/",
        },
        {
          "ariaLabel": "Subpath",
          "current": true,
          "label": "Subpath",
          "to": "/subpath",
        },
      ]
    `)
  })
  it('i18n', async () => {
    useI18nMock.mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          if (s === 'breadcrumb.items.about.label') {
            return 'About I18n'
          }
          return fallback
        }),
      }
    })
    mockCurrentPath('/about', { name: 'about___en', path: '/about' })
    const breadcrumbs = useBreadcrumbItems()
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
      [
        {
          "ariaLabel": "Home",
          "current": false,
          "label": "Home",
          "to": "/",
        },
        {
          "ariaLabel": "About I18n",
          "current": true,
          "label": "About I18n",
          "to": "/about",
        },
      ]
    `)
  })
  it('catch-all', async () => {
    useI18nMock.mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          return fallback
        }),
      }
    })
    mockCurrentPath('/docs/seo-utils/getting-started/installation', {
      name: 'docs-slug',
      path: '/docs/:slug(.*)*',
    })
    const breadcrumbs = useBreadcrumbItems()
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
      [
        {
          "ariaLabel": "Home",
          "current": false,
          "label": "Home",
          "to": "/",
        },
        {
          "ariaLabel": "Docs",
          "current": false,
          "label": "Docs",
          "to": "/docs",
        },
        {
          "ariaLabel": "Seo Utils",
          "current": false,
          "label": "Seo Utils",
          "to": "/docs/seo-utils",
        },
        {
          "ariaLabel": "Getting Started",
          "current": false,
          "label": "Getting Started",
          "to": "/docs/seo-utils/getting-started",
        },
        {
          "ariaLabel": "Installation",
          "current": true,
          "label": "Installation",
          "to": "/docs/seo-utils/getting-started/installation",
        },
      ]
    `)
  })
  it('catch-all #2', async () => {
    useI18nMock.mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          return fallback
        }),
      }
    })
    useRouterMock.mockImplementation(() => {
      return {
        currentRoute: {
          value: {
            name: 'docs-slug',
            path: '/docs/seo-utils/getting-started/installation',
          },
        },
        resolve() {
          return null
        },
      }
    })
    useRouteMock.mockImplementation(() => {
      return {
        path: '/docs/seo-utils/getting-started/installation',
      }
    })
    const breadcrumbs = useBreadcrumbItems()
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
      [
        {
          "ariaLabel": "",
          "current": false,
          "label": "",
          "to": "/",
        },
        {
          "ariaLabel": "Docs",
          "current": false,
          "label": "Docs",
          "to": "/docs",
        },
        {
          "ariaLabel": "Seo Utils",
          "current": false,
          "label": "Seo Utils",
          "to": "/docs/seo-utils",
        },
        {
          "ariaLabel": "Getting Started",
          "current": false,
          "label": "Getting Started",
          "to": "/docs/seo-utils/getting-started",
        },
        {
          "ariaLabel": "Installation",
          "current": true,
          "label": "Installation",
          "to": "/docs/seo-utils/getting-started/installation",
        },
      ]
    `)
  })
  it('i18n schema.org', async () => {
    let schemaOrgArgs: any[] = []
    useI18nMock.mockImplementation(() => {
      return {
        t: vi.fn().mockImplementation((s: string, fallback: string) => {
          if (s === 'breadcrumb.items.about.label') {
            return 'About I18n'
          }
          return fallback
        }),
        locale: 'en',
        strategy: 'prefix',
      }
    })
    defineBreadcrumbMock.mockImplementation((args) => {
      args.itemListElement = toValue(args.itemListElement)
      return args
    })
    useSchemaOrgMock.mockImplementation((args) => {
      schemaOrgArgs = args
      return args
    })
    useRouteMock.mockImplementation(() => {
      return {
        path: '/en/about',
      }
    })
    useRouterMock.mockImplementation(() => {
      return {
        currentRoute: {
          value: {
            name: 'about___en',
            path: '/en/about',
          },
        },
        resolve(s: string) {
          if (s !== '/en') {
            return {
              matched: [
                {
                  name: 'about___en',
                  path: '/en/about',
                },
              ],
            }
          }
          return { matched: [{ name: 'index' }] }
        },
      }
    })
    const breadcrumbs = useBreadcrumbItems()
    expect(schemaOrgArgs.map((s) => {
      s.itemListElement = toValue(s.itemListElement)
      s.itemListElement = s.itemListElement.map((s: any) => {
        s.item = toValue(s.item)
        return s
      })
      return s
    })).toMatchInlineSnapshot(`
        [
          {
            "id": "#breadcrumb",
            "itemListElement": [
              {
                "item": "/en",
                "name": "Home",
              },
              {
                "item": "/en/about",
                "name": "About I18n",
              },
            ],
          },
        ]
      `)
    expect(breadcrumbs.value).toMatchInlineSnapshot(`
      [
        {
          "ariaLabel": "Home",
          "current": false,
          "label": "Home",
          "to": "/en",
        },
        {
          "ariaLabel": "About I18n",
          "current": true,
          "label": "About I18n",
          "to": "/en/about",
        },
      ]
    `)
  })
})
