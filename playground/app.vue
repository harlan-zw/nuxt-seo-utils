<script setup lang="ts">
useMetaTags({
  ogImage: 'https://nuxtjs.org/meta_400.png',
  ogUrl: 'https://nuxtjs.org',
  ogSiteName: 'NuxtJS',
  ogType: 'website',
  ogLocale: 'en_US',
  ogLocaleAlternate: 'fr_FR',
  twitterCard: 'summary_large_image',
  twitterSite: '@nuxt_js',
  robots: {
    noindex: true,
  },
})

useHeadRaw({
  script: [
    {
      innerHTML: 'console.log("Non-encoded HTML!")',
    },
  ],
})
</script>

<template>
  <div>
    <NuxtPage />
    <DebugHead />
  </div>
</template>
