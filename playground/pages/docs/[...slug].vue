<script setup lang="ts">
import { useBreadcrumbItems } from '#imports'

const items = useBreadcrumbItems({
  overrides: [
    undefined,
    { label: 'Documentation' },
    { label: 'Intro - yo' },
  ],
})
</script>

<template>
  <div>
    docs slug catch-all
    <nav>
      {{ items.map(item => item.label).join(' > ') }}
    </nav>
    <NuxtLink to="/delayed">
      delayed
    </NuxtLink>
  </div>
</template>
