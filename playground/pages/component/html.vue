<script lang="ts" setup>
const { colour, changeColour } = useChangeColour()
</script>

<template>
  <div>
    <Html lang="en-AU" dir="ltr" :class="`bg-${colour}-500`" :style="`background: ${colour}`" />
    <h1>html-attrs</h1>
    <button @click="changeColour">
      Switch background colour
    </button>
  </div>
</template>
