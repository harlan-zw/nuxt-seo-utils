<script lang="ts" setup>
useServerHead({
  link: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      rel: 'stylesheet',
    },
  ],
})

const route = useRouter().currentRoute

useHead({
  htmlAttrs: {
    class: () => route.value.name,
  },
  // convert slug name to title case
  title: () => route.value.meta.title
    || `${route.value.name?.charAt(0).toUpperCase()}${route.value.name?.slice(1)}`
})

useSeoMeta({
  description: 'My site description',
  ogImage: 'https://nuxtjs.org/meta_400.png',
})
</script>

<template>
<div>
  <div>
    <NuxtPage />
  </div>
  <div style="margin-top: 30px;">
    <DebugHead />
  </div>
</div>
</template>
