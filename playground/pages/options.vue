<script lang="ts">
import { defineComponent } from 'vue'
import type { MetaObject } from '@nuxt/schema'

export default defineComponent({
  head(): MetaObject {
    return {
      title: 'Options',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'My page description',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    }
  },
})
</script>

<template>
  <div>
    Nuxt module playground!
    <button @click="count++">
      Click me
    </button>
    <div>
      <NuxtLink to="/delayed">
        delayed
      </NuxtLink>
      <NuxtLink to="/red">
        red
      </NuxtLink>
    </div>
  </div>
</template>
