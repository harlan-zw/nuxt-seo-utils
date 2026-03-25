<script lang="ts" setup>
const route = useRoute()
const breadcrumbs = useBreadcrumbItems()

useSeoMeta({
  title: `Blog - ${route.params.slug}`,
})
</script>

<template>
  <div>
    <h1>{{ route.params.slug }}</h1>
    <nav aria-label="Breadcrumb">
      <ol>
        <li v-for="item in breadcrumbs" :key="item.label">
          <NuxtLink v-if="item.to" :to="item.to">
            {{ item.label }}
          </NuxtLink>
          <span v-else>{{ item.label }}</span>
        </li>
      </ol>
    </nav>
    <p>This is a blog post page. The breadcrumbs above are generated automatically from the route.</p>
    <NuxtLink to="/blog">
      Back to Blog
    </NuxtLink>
  </div>
</template>
