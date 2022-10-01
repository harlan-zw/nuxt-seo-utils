<template>
  <div>
    <NuxtPage />
    <DebugHead/>
  </div>
</template>

<script setup lang="ts">
useMetaTags({
  ogTitle: 'test title og',
  ogDescription: 'test description og',
  ogImage: 'https://nuxtjs.org/meta_400.png',
  ogUrl: 'https://nuxtjs.org',
  ogSiteName: 'NuxtJS',
  ogType: 'website',
  ogLocale: 'en_US',
  ogLocaleAlternate: 'fr_FR',
  twitterCard: 'summary_large_image',
  twitterSite: '@nuxt_js',
  robots: {
    noindex: true
  }
})

</script>
