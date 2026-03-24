<script lang="ts" setup>
import { computed, useRoute } from '#imports'
import { path as hostPath, refreshSources } from 'nuxtseo-layer-devtools/composables/state'
import { appFetch } from './composables/rpc'

const route = useRoute()
const activeTab = computed({
  get: () => route.path === '/social' ? 'social' : 'meta',
  set: () => {},
})

const navItems = [
  { value: 'meta', to: '/', icon: 'carbon:tag', label: 'Meta Tags' },
  { value: 'social', to: '/social', icon: 'carbon:share', label: 'Social' },
]

const connectionReady = computed(() => !!appFetch.value)
</script>

<template>
  <DevtoolsLayout
    v-model:active-tab="activeTab"
    title="SEO Utils"
    icon="carbon:search-locate"
    :nav-items="navItems"
    github-url="https://github.com/harlan-zw/nuxt-seo-utils"
    @refresh="refreshSources"
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
