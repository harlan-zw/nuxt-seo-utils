<script setup lang="ts">
import { useBreadcrumbItems } from '#imports'

// suspense
await new Promise(resolve => setTimeout(resolve, 3000))

useBreadcrumbItems({
  overrides: [
    undefined,
    {
      label: 'About us',
    },
  ],
})
</script>

<template>
  <div>about page</div>
</template>
