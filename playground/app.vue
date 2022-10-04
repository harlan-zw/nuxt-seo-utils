<script setup lang="ts">
useMetaTags({
  ogImage: 'https://harlanzw.com/og.png',
  ogUrl: 'https://harlanzw.com',
  ogSiteName: 'Harlan Wilton',
  ogType: 'website',
  ogLocale: 'en_AU',
  twitterCard: 'summary_large_image',
  twitterSite: '@harlan-zw',
  robots: {
    maxSnippet: -1,
    maxImagePreview: 'large',
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
