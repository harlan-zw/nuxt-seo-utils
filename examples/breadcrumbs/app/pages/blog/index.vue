<script lang="ts" setup>
const breadcrumbs = useBreadcrumbItems()
</script>

<template>
  <div>
    <h1>Blog</h1>
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
    <ul>
      <li>
        <NuxtLink to="/blog/hello-world">
          Hello World
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/blog/getting-started">
          Getting Started
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
