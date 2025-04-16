<script lang="ts" setup>
import { useBreadcrumbItems } from '#imports'
import { computed } from 'vue'

const breadcrumb = useBreadcrumbItems()

const crumbs = computed(() => {
  return breadcrumb.value
    .map((m, i) => m.label + (i < breadcrumb.value.length - 1 ? ' > ' : ''))
    .join('')
})
</script>

<template>
  <nav>
    {{ crumbs }}
  </nav>
</template>
