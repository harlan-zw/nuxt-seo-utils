<script lang="ts" setup>
definePageMeta({
  title: 'Home',
})

useSeoMeta({
  title: 'Home',
  description: 'Welcome to our website. Discover our latest content and updates.',
  ogTitle: 'Home | My Website',
  ogDescription: 'Welcome to our website. Discover our latest content and updates.',
  ogImage: 'https://example.com/og-home.png',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div>
    <h1>Home</h1>
    <p>This page has custom SEO meta tags. Inspect the page source to see them.</p>
    <p>
      Visit the <NuxtLink to="/about">
        About page
      </NuxtLink> to see different meta tags per page.
    </p>
  </div>
</template>
