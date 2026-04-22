<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  script: [
    {
      innerHTML: 'var   unheadMinifyTarget   =   true  ;   // should be minified by @unhead/vue/vite',
    },
  ],
  style: [
    {
      innerHTML: '.unhead-minify-target  {  color:  red;  /* unhead comment */  display:  block  }',
    },
  ],
})
</script>

<template>
  <div>unhead minify target</div>
</template>
