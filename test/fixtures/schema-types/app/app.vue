<script setup lang="ts">
import { useRuntimeConfig } from 'nuxt/app'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase.toUpperCase()
const retryLimit = config.public.retryLimit.toFixed(0)
const enabled: boolean = config.public.nested.enabled
</script>

<template>
  <div>{{ apiBase }} {{ retryLimit }} {{ enabled }}</div>
</template>
