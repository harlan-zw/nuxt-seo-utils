<script lang="ts" setup>
import { onMounted, ref } from 'vue'

const loading = ref(true)

onMounted(() => {
  setTimeout(() => {
    loading.value = false
  }, 2000)
})
</script>

<template>
  <div>
    <div>see https://github.com/harlan-zw/nuxt-seo-utils/issues/59</div>
    <div v-if="loading">
      Skeleton
    </div>
    <Breadcrumbs v-else style="height: 20px; background: red" />
  </div>
</template>
