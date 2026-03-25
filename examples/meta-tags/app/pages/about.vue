<script lang="ts" setup>
definePageMeta({
  title: 'About Us',
})

useSeoMeta({
  title: 'About Us',
  description: 'Learn more about our team, mission, and values.',
  ogTitle: 'About Us | My Website',
  ogDescription: 'Learn more about our team, mission, and values.',
  ogImage: 'https://example.com/og-about.png',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <h1>About Us</h1>
    <p>This page demonstrates per-page SEO meta tags using useSeoMeta and definePageMeta.</p>
    <p>Each page can have its own title, description, and Open Graph tags.</p>
    <NuxtLink to="/">
      Back to Home
    </NuxtLink>
  </div>
</template>
