import type { NuxtLinkProps } from 'nuxt/app'
import type { MaybeRefOrGetter } from 'vue'
import type { RouteMeta } from 'vue-router'
import {
  defineBreadcrumb,
  useI18n,
  useSchemaOrg,
} from '#imports'
import { useSiteConfig } from '#site-config/app/composables/useSiteConfig'
import { createSitePathResolver } from '#site-config/app/composables/utils'
import { defu } from 'defu'
import { fixSlashes } from 'nuxt-site-config/urls'
import { useRouter } from 'nuxt/app'
import { withoutTrailingSlash } from 'ufo'
import { computed, toValue } from 'vue'
import { pathBreadcrumbSegments } from '../../shared/breadcrumbs'

interface NuxtUIBreadcrumbItem extends NuxtLinkProps {
  label: string
  labelClass?: string
  icon?: string
  iconClass?: string
  as?: string
  type?: string
  disabled?: boolean
  active?: boolean
  exact?: boolean
  exactQuery?: boolean
  exactMatch?: boolean
  inactiveClass?: string
  [key: string]: any
}

export interface BreadcrumbProps {
  /**
   * Generate the breadcrumbs based on a different path than the current route.
   */
  path?: MaybeRefOrGetter<string>
  /**
   * The id of the breadcrumb list. It's recommended to provide a unique
   * id when adding multiple breadcrumb lists to the same page.
   */
  id?: string
  /**
   * Append additional breadcrumb items to the end of the list. This is applied
   * after the `overrides` option.
   */
  append?: MaybeRefOrGetter<BreadcrumbItemProps[]>
  /**
   * Prepend additional breadcrumb items to the start of the list. This is applied
   * after the `overrides` option.
   */
  prepend?: MaybeRefOrGetter<BreadcrumbItemProps[]>
  /**
   * Override any of the breadcrumb items based on the index.
   */
  overrides?: MaybeRefOrGetter<(BreadcrumbItemProps | false | undefined)[]>
  /**
   * Should the schema.org breadcrumb be generated.
   * @default true
   */
  schemaOrg?: boolean
  /**
   * The Aria Label for the breadcrumbs.
   * You shouldn't need to change this.
   *
   * @default 'Breadcrumbs'
   */
  ariaLabel?: string
  /**
   * Should the current breadcrumb item be shown.
   *
   * @default false
   */
  hideCurrent?: MaybeRefOrGetter<boolean>
  /**
   * Should the root breadcrumb be shown.
   */
  hideRoot?: MaybeRefOrGetter<boolean>
}

export interface BreadcrumbItemProps extends NuxtUIBreadcrumbItem {
  /** Whether the breadcrumb item represents the aria-current. */
  current?: boolean
  /**
   * The type of current location the breadcrumb item represents, if `isCurrent` is true.
   * @default 'page'
   */
  ariaCurrent?: 'page' | 'step' | 'location' | 'date' | 'time' | boolean | 'true' | 'false'
  to?: string
  ariaLabel?: string
  separator?: boolean | string
  class?: (string | string[] | undefined)[] | string
  /**
   * @internal
   */
  _props?: {
    first: boolean
    last: boolean
  }
}

function withoutQuery(path: string) {
  return path.split('?')[0]
}

function titleCase(s: string) {
  return s
    .replaceAll('-', ' ')
    .replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
}

/**
 * Generate an automatic breadcrumb list that helps users to navigate between pages.
 *
 * - Integrates with [Nuxt Schema.org](/schema-org/getting-started/installation) to generate [BreadcrumbList](https://schema.org/BreadcrumbList) structured data.
 * - Integrates with [Nuxt I18n](https://i18n.nuxtjs.org/) to generate localized breadcrumbs.
 *
 * @see https://github.com/harlan-zw/nuxt-seo/blob/main/src/runtime/nuxt/composables/useBreadcrumbItems.ts
 * @docs https://nuxtseo.com/nuxt-seo/api/breadcrumbs
 */
export function useBreadcrumbItems(options: BreadcrumbProps = {}) {
  const router = useRouter()
  const i18n = useI18n()
  const siteResolver = createSitePathResolver({
    canonical: true,
    absolute: true,
  })
  const siteConfig = useSiteConfig()
  const items = computed(() => {
    let rootNode = '/'
    if (i18n) {
      if (i18n.strategy === 'prefix' || (i18n.strategy !== 'no_prefix' && toValue(i18n.defaultLocale) !== toValue(i18n.locale)))
        rootNode = `/${toValue(i18n.locale)}`
    }
    const current = withoutQuery(withoutTrailingSlash(toValue(options.path || router.currentRoute.value?.path) || rootNode))
    // apply overrides
    const overrides = toValue(options.overrides) || []
    const segments = pathBreadcrumbSegments(current, rootNode)
      .map((path, index) => {
        let item = <BreadcrumbItemProps> {
          to: path,
        }
        if (typeof overrides[index] !== 'undefined') {
          if (overrides[index] === false)
            return false
          item = defu(overrides[index] as any as BreadcrumbItemProps, item)
        }
        return item
      })
    // apply prepends and appends
    if (options.prepend)
      segments.unshift(...toValue(options.prepend))
    if (options.append)
      segments.push(...toValue(options.append))
    return (segments.filter(Boolean) as BreadcrumbItemProps[])
      .map((item) => {
        let fallbackLabel = titleCase(String((item.to || '').split('/').pop()))
        let fallbackAriaLabel = ''
        const route = router.resolve(item.to as string)?.matched?.[0]
        if (route) {
          const routeMeta = (route?.meta || {}) as RouteMeta & { title?: string, breadcrumbLabel: string, breadcrumbTitle: string }
          // merge with the route meta
          if (routeMeta.breadcrumb) {
            item = {
              ...item,
              ...routeMeta.breadcrumb,
            }
          }
          const routeName = String(route.name).split('___')[0]
          if (routeName === 'index') {
            fallbackLabel = 'Home'
          }
          fallbackLabel = routeMeta.breadcrumbLabel || routeMeta.breadcrumbTitle || routeMeta.title || fallbackLabel
          fallbackLabel = i18n.t(`breadcrumb.items.${routeName}.label`, fallbackLabel, { missingWarn: true })
          fallbackAriaLabel = i18n.t(`breadcrumb.items.${routeName}.ariaLabel`, fallbackAriaLabel, { missingWarn: false })
        }

        // allow opt-out of label normalise with `false` value
        item.label = item.label || fallbackLabel
        item.ariaLabel = item.ariaLabel || fallbackAriaLabel || item.label
        // mark the current based on the options
        item.current = item.current || item.to === current
        if (toValue(options.hideCurrent) && item.current)
          return false
        return item
      })
      .map((m) => {
        if (m && m.to) {
          m.to = fixSlashes(siteConfig.trailingSlash, m.to)
          if (m.to === rootNode && toValue(options.hideRoot))
            return false
        }
        return m
      })
      .filter(Boolean) as BreadcrumbItemProps[]
  })

  const schemaOrgEnabled = typeof options.schemaOrg === 'undefined' ? true : options.schemaOrg
  // TODO can probably drop this schemaOrgEnabled flag as we mock the function
  if ((import.meta.dev || import.meta.server) && schemaOrgEnabled) {
    useSchemaOrg([
      defineBreadcrumb({
        id: `#${options.id || 'breadcrumb'}`,
        itemListElement: computed(() => items.value.map(item => ({
          name: item.label || item.ariaLabel,
          item: item.to ? siteResolver(item.to) : undefined,
        }))),
      }),
    ])
  }
  return items
}
