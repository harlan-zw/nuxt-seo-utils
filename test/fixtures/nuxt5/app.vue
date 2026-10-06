<script setup lang="ts">
import type { SharePlatform } from '#seo-utils/app/composables/useShareLinks'
import { useBreadcrumbItems, useShareLinks } from '#seo-utils/app'
const platform: SharePlatform = 'twitter'
const shareLinks = useShareLinks()
const breadcrumbs = useBreadcrumbItems()
// Installed Schema can be disabled. Its auto-imports must remain safe to call.
useSchemaOrg([defineWebSite(), defineWebPage(), defineBreadcrumb([])])
useSeoMeta({
  description: 'Nuxt 5 compatible SEO utils',
})
</script>

<template>
  <div>Nuxt SEO Utils Nitro 3 <a :href="shareLinks[platform]">Share</a><span v-for="crumb in breadcrumbs" :key="crumb.to">{{ crumb.label }}</span></div>
</template>
