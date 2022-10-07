<script lang="ts" setup>
const { colour, changeColour } = useChangeColour()

useHead({
  htmlAttrs: {
    style: () => `background: ${colour.value}`,
    class: () => `bg-${colour.value}-500`,
    lang: 'en-AU',
    dir: 'ltr',
  },
})
</script>

<template>
  <div>
    <h1>html-attrs</h1>
    <button @click="changeColour">
      Switch background colour
    </button>
  </div>
</template>
