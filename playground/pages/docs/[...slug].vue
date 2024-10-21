<script setup lang="ts">
import { useBreadcrumbItems } from '../../../src/runtime/nuxt/composables/useBreadcrumbItems'

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
