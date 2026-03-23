<script lang="ts" setup>
import { computed, path as hostPath } from '#imports'
import { appFetch } from './composables/rpc'

const navItems = [
  { value: 'meta', to: '/', icon: 'carbon:tag', label: 'Meta Tags' },
  { value: 'social', to: '/social', icon: 'carbon:share', label: 'Social' },
]

const connectionReady = computed(() => !!appFetch.value)
</script>

<template>
  <DevtoolsLayout
    title="SEO Utils"
    icon="carbon:search-locate"
    version="7.0.19"
    github-url="https://github.com/harlan-zw/nuxt-seo-utils"
    :nav-items="navItems"
  >
    <template #actions>
      <UTooltip :text="connectionReady ? `Monitoring ${hostPath}` : 'Connecting...'" :delay-duration="300">
        <div
          class="w-2 h-2 rounded-full transition-colors"
          :class="connectionReady ? 'bg-green-500' : 'bg-amber-500 animate-pulse'"
        />
      </UTooltip>
    </template>
    <NuxtPage />
  </DevtoolsLayout>
</template>
