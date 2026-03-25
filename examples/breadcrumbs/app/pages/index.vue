<script lang="ts" setup>
const breadcrumbs = useBreadcrumbItems()
</script>

<template>
  <div>
    <h1>Home</h1>
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
    <p>
      Navigate to the <NuxtLink to="/blog">
        Blog
      </NuxtLink> to see breadcrumbs in action.
    </p>
  </div>
</template>
