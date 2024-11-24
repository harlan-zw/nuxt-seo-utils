<script setup lang="ts">
import { useBreadcrumbItems } from '#seo-utils/app/composables/useBreadcrumbItems'

const breacrumb = useBreadcrumbItems()
</script>

<template>
  <div>
    catch-all
    <nav>
      {{ breacrumb.map(item => item.label).join(' > ') }}
    </nav>
  </div>
</template>
