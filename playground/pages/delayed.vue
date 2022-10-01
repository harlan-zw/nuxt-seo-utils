<script setup lang="ts">
await new Promise((resolve) => setTimeout(resolve, 3000));

useHead({
  title: 'Index title',
});
</script>

<template>
<div>
  <h2>Test</h2>
  <NuxtLink to="/">back</NuxtLink>
</div>
</template>
