<script setup lang="ts">
import { useColorMode } from '#imports'

const colorMode = useColorMode()

function toggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}
</script>

<template>
  <button id="toggle-color-mode" type="button" @click="toggleColorMode">
    Toggle color mode
  </button>
</template>
