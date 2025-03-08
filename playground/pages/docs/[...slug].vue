<script setup lang="ts">
const items = useBreadcrumbItems({
  overrides: [
    undefined,
    { label: 'Documentation' },
    { label: 'Intro - yo' },
  ],
})
</script>

<template>
  <div>
    docs slug catch-all
    <nav>
      {{ items.map(item => item.label).join(' > ') }}
    </nav>
  </div>
</template>
