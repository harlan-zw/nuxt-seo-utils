<script lang="ts" setup>
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
