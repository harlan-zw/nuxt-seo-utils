<script setup lang="ts">
const count = ref(0)

useHead({
  title: () => `test ${count.value}`,
  titleTemplate: '%s - Nuxt module playground',
  link: [
    {
      href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      rel: 'stylesheet',
    },
  ],
  script: [
    {
      children: 'console.log("test")',
    },
  ],
  meta: [
    {
      charset: () => 'utf-8',
    },
    {
      name: 'description',
      content: ref('description'),
      hid: 'test',
      vmid: 'test',
    },
  ],
  base: {
    href: '/',
  },
})
</script>

<template>
  <div>
    Nuxt module playground!
    <button @click="count++">
      Click me
    </button>
    <div>
      <NuxtLink to="/delayed">
        delayed
      </NuxtLink>
      <NuxtLink to="/red">
        red
      </NuxtLink>
    </div>
  </div>
</template>
