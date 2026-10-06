<script setup lang="ts">
import type { SharePlatform } from '#seo-utils/app/composables/useShareLinks'
import { useShareLinks } from '#seo-utils/app'
const platform: SharePlatform = 'twitter'
const shareLinks = useShareLinks()
useSeoMeta({
  description: 'Nuxt 5 compatible SEO utils',
})
</script>

<template>
  <div>Nuxt SEO Utils Nitro 3 <a :href="shareLinks[platform]">Share</a></div>
</template>
