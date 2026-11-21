<script setup lang="ts">
import { useSeoMeta } from '#imports'
useSeoMeta({ title: 'Article' })
if (import.meta.server) {
  useSeoMeta({
    description: 'Article description',
    ogTitle: 'Social article title',
    ogType: 'article',
  })
}
</script>

<template>
  <div>article</div>
</template>
