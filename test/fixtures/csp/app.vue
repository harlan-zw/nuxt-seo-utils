<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  script: [{
    id: 'prerender-regex',
    innerHTML: String.raw`globalThis.prerenderRegexMatches = /https?:\/\//.test('https://example.com');`,
  }],
})
</script>

<template>
  <div>
    CSP fixture
  </div>
</template>
