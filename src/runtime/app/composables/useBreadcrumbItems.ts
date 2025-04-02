import type { NuxtLinkProps } from 'nuxt/app'
import type { MaybeRefOrGetter, Ref } from 'vue'
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
import { useNuxtApp, useRoute, useRouter, useState } from 'nuxt/app'
import { withoutTrailingSlash } from 'ufo'
import { computed, getCurrentInstance, watch, inject, onScopeDispose, onUnmounted, provide, ref, toRaw, toValue } from 'vue'
import { pathBreadcrumbSegments } from '../../shared/breadcrumbs'

interface NuxtUIBreadcrumbItem extends NuxtLinkProps {
  label: string
  labelClass?: string
  icon?: string
  iconClass?: string
  as?: string
  type?: 'button' | 'submit' | 'reset'
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
  /**
   * The root segment of the breadcrumb list.
   *
   * By default, this will be `/`, unless you're using Nuxt I18n with a prefix strategy.
   */
  rootSegment?: string
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

const BreadcrumbCtx = Symbol('BreadcrumbCtx')

/**
 * Generate an automatic breadcrumb list that helps users to navigate between pages.
 *
 * - Integrates with [Nuxt Schema.org](/schema-org/getting-started/installation) to generate [BreadcrumbList](https://schema.org/BreadcrumbList) structured data.
 * - Integrates with [Nuxt I18n](https://i18n.nuxtjs.org/) to generate localized breadcrumbs.
 *
 * @see https://github.com/harlan-zw/nuxt-seo/blob/main/src/runtime/nuxt/composables/useBreadcrumbItems.ts
 * @docs https://nuxtseo.com/nuxt-seo/api/breadcrumbs
 */
export function useBreadcrumbItems(_options: BreadcrumbProps = {}) {
  const vm = getCurrentInstance()
  const id = _options.id || 'breadcrumb'
  const pauseUpdates = ref(import.meta.client)
  let stateRef: Ref<Record<string, (false | BreadcrumbProps)[]>> | null = null
  if (vm) {
    stateRef = inject(BreadcrumbCtx, null)
    if (!stateRef) {
      stateRef = ref({})
      provide(BreadcrumbCtx, stateRef)
    }
    const state = stateRef.value
    if (!state[id]) {
      state[id] = []
    }
    const idx = state[id].push(_options) - 1
    stateRef.value = state
    onUnmounted(() => {
      const state = toRaw(stateRef!.value)
      if (state[id]) {
        // avoid assigning new array entries
        state[id] = state[id].map((_, i) => i === idx ? false : _)
        stateRef!.value = state
      }
    })
    if (import.meta.client) {
      const nuxtApp = useNuxtApp()
      const _: any[] = []
      // pause dom updates until page is ready and between page transitions
      _.push(nuxtApp.hooks.hook('page:start', () => {
        pauseUpdates.value = true
      }))
      _.push(nuxtApp.hooks.hook('page:finish', () => {
        if (!nuxtApp.isHydrating) {
          pauseUpdates.value = false
        }
      }))
      // unpause on error
      _.push(nuxtApp.hooks.hook('app:error', () => {
        pauseUpdates.value = false
      }))
      // unpause the DOM once the mount suspense is resolved
      _.push(nuxtApp.hooks.hook('app:suspense:resolve', () => {
        pauseUpdates.value = false
      }))
      onScopeDispose(() => {
        _.forEach(hook => hook?.())
        _.length = 0
      })
    }
  }
  const route = useRoute()
  const router = useRouter()
  const i18n = useI18n()
  const siteResolver = createSitePathResolver({
    canonical: true,
    absolute: true,
  })
  const lastBreadcrumbs = useState<BreadcrumbItemProps[]>(`nuxt-seo:breadcrumb:${id}`, () => [])
  const siteConfig = useSiteConfig()
  const items = computed(() => {
    if (import.meta.client && pauseUpdates.value) {
      return lastBreadcrumbs.value
    }
    const optionStack = stateRef?.value?.[id] || [_options]
    const flatOptions = (toRaw([...optionStack]).filter(Boolean) as BreadcrumbProps[]).reduce((acc, cur) => {
      acc.rootSegment = acc.rootSegment || cur.rootSegment
      acc.path = acc.path || cur.path
      return acc
    }, {})
    let rootNode = flatOptions.rootSegment || '/'
    if (i18n) {
      if (i18n.strategy === 'prefix' || (i18n.strategy !== 'no_prefix' && toValue(i18n.defaultLocale) !== toValue(i18n.locale)))
        rootNode = `${rootNode}${toValue(i18n.locale)}`
    }
    const current = withoutQuery(withoutTrailingSlash(toValue(flatOptions.path) || toRaw(route).path || rootNode))
    // apply overrides
    const allOverrides = (toRaw([...optionStack]).filter(Boolean) as BreadcrumbProps[])?.map(opts => toValue(opts.overrides)).filter(Boolean)
    const flatOverrides = allOverrides?.reduce((acc: (BreadcrumbItemProps | false | undefined)[], i) => {
      // merge them based on index
      if (i) {
        i.forEach((item, index) => {
          if (item !== undefined) {
            acc[index] = item
          }
        })
      }
      return acc
    }, []) || {}
    const segments = pathBreadcrumbSegments(current, rootNode)
      .map((path, index) => {
        let item = <BreadcrumbItemProps> {
          to: path,
        }
        if (typeof flatOverrides[index] !== 'undefined') {
          if (flatOverrides[index] === false)
            return false
          item = defu(flatOverrides[index] as any as BreadcrumbItemProps, item)
        }
        return item
      })

    const allPrepends = (toRaw([...optionStack]).filter(Boolean) as BreadcrumbProps[]).flatMap(opts => toValue(opts.prepend)).filter(Boolean) as any as BreadcrumbItemProps[]
    const allAppends = (toRaw([...optionStack]).filter(Boolean) as BreadcrumbProps[]).flatMap(opts => toValue(opts.append)).filter(Boolean) as any as BreadcrumbItemProps[]
    // apply prepends and appends
    if (allPrepends.length)
      segments.unshift(...allPrepends)
    if (allAppends.length)
      segments.push(...allAppends)
    return (segments.filter(Boolean) as BreadcrumbItemProps[])
      .map((item) => {
        let fallbackLabel = titleCase(String((item.to || '').split('/').pop()))
        let fallbackAriaLabel = ''
        const route = item.to ? router.resolve(item.to as string)?.matched?.[0] : null
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
          fallbackLabel = i18n.t(`breadcrumb.items.${routeName}.label`, fallbackLabel, { missingWarn: false })
          fallbackAriaLabel = i18n.t(`breadcrumb.items.${routeName}.ariaLabel`, fallbackAriaLabel, { missingWarn: false })
        }

        // allow opt-out of label normalise with `false` value
        item.label = item.label || fallbackLabel
        item.ariaLabel = item.ariaLabel || fallbackAriaLabel || item.label
        // mark the current based on the options
        item.current = item.current || item.to === current
        if (toValue(flatOptions.hideCurrent) && item.current)
          return false
        return item
      })
      .map((m) => {
        if (m && m.to) {
          m.to = fixSlashes(siteConfig.trailingSlash, m.to)
          if (m.to === rootNode && toValue(flatOptions.hideRoot))
            return false
        }
        return m
      })
      .filter(Boolean) as BreadcrumbItemProps[]
  })

  watch(items, (newItems) => {
    if (!pauseUpdates.value) {
      lastBreadcrumbs.value = newItems
    }
  }, { immediate: true })

  const schemaOrgEnabled = typeof _options.schemaOrg === 'undefined' ? true : _options.schemaOrg
  // TODO can probably drop this schemaOrgEnabled flag as we mock the function
  // @ts-expect-error untyped
  if ((import.meta.dev || import.meta.server || import.meta.env?.NODE_ENV === 'test') && schemaOrgEnabled) {
    // @ts-expect-error untyped
    useSchemaOrg([
      // @ts-expect-error untyped
      defineBreadcrumb({
        id: `#${id}`,
        itemListElement: computed(() => items.value.map(item => ({
          name: item.label || item.ariaLabel,
          item: item.to ? siteResolver(item.to) : undefined,
        }))),
      }),
    ])
  }
  return items
}
