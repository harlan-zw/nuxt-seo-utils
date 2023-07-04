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
})

// works with useSeoMeta
useSeoMeta({
  description: 'Hi, welcome to the %envName v%app.version of %siteName.',
})

// works with useHead
useHead({
  meta: [

  ],
})
</script>

<template>
  <div>
    <div>
      <NuxtPage />
    </div>
  </div>
</template>
