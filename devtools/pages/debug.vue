<script setup lang="ts">
import { computed } from 'vue'
import { data } from '../composables/state'

const runtimeConfigItems = computed(() => {
  if (!data.value?.runtimeConfig)
    return []
  return Object.entries(data.value.runtimeConfig).map(([key, value]) => ({
    key,
    value: typeof value === 'object' ? JSON.stringify(value) : String(value),
    mono: true,
  }))
})

const siteConfigItems = computed(() => {
  if (!data.value?.siteConfig)
    return []
  return Object.entries(data.value.siteConfig).map(([key, value]) => ({
    key,
    value: String(value),
    mono: true,
  }))
})
</script>

<template>
  <div class="space-y-5 stagger-children">
    <DevtoolsSection icon="carbon:settings" text="Runtime Config">
      <template #actions>
        <DevtoolsMetric :value="runtimeConfigItems.length" label="keys" />
      </template>
      <DevtoolsKeyValue :items="runtimeConfigItems" striped />
    </DevtoolsSection>

    <DevtoolsSection icon="carbon:earth" text="Site Config">
      <template #actions>
        <DevtoolsMetric :value="siteConfigItems.length" label="keys" />
      </template>
      <DevtoolsKeyValue :items="siteConfigItems" striped />
    </DevtoolsSection>

    <DevtoolsSection icon="carbon:code" text="Raw JSON">
      <DevtoolsSnippet
        :code="JSON.stringify(data || {}, null, 2)"
        lang="json"
        label="debug.json"
      />
    </DevtoolsSection>
  </div>
</template>
