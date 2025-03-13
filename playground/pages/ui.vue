<script setup lang="ts">
import { useBreadcrumbItems } from '#imports'

const breadcrumbs = useBreadcrumbItems()
</script>

<template>
  <div>
    <UBreadcrumb :items="breadcrumbs" />
  </div>
</template>
