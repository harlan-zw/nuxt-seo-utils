<script setup lang="ts">
import { useHead, useRequestURL } from '#imports'

const marker = useRequestURL().searchParams.get('marker') || 'Unknown'
const script = `var   runtime${marker}   =   true  ;   // runtime whitespace`

useHead({
  script: [{ innerHTML: script }],
})
</script>

<template>
  <div>Runtime minification default test</div>
</template>
