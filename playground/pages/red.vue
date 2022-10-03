<script setup lang="ts">
useHead({
  htmlAttrs: {
    style: 'background: red',
  },
})
</script>

<template>
  <div>
    <h2>red bg</h2>
    <NuxtLink to="/">
      back
    </NuxtLink>
  </div>
</template>
