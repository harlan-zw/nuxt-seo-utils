<script lang="ts" setup>
import { ref, useBreadcrumbItems } from '#imports'

const path = ref('/docs/seo-utils/api/breadcrumbs')

const hideRoot = ref(false)
const hideCurrent = ref(false)
const items = useBreadcrumbItems({ path, hideRoot, hideCurrent })
</script>

<template>
  <div class="mx-3">
    <p class="text-sm mb-3">
      This demo integrates directly with the <a href="https://ui.nuxt.com/navigation/breadcrumb">Nuxt UI Breadcrumb</a> component.
    </p>
    <div class="not-prose">
      <div class="flex justify-center border-2 mb-5 rounded border-solid border-neutral-100 dark:border-neutral-800 p-5">
        <UBreadcrumb id="sub" :items="items" class="not-prose " />
      </div>
      <div class="flex items-start gap-5 ">
        <div>
          <UInput v-model="path" type="text" class="mb-2" />
          <div class="mx-2 text-xs opacity-60">
            Enter any path and watch the breadcrumbs be generated!
          </div>
        </div>
        <div class="flex items-center space-x-3 text-sm mt-2">
          <UCheckbox v-model="hideRoot" label="Hide Root" />
          <UCheckbox v-model="hideCurrent" label="Hide Current" />
        </div>
      </div>
    </div>
  </div>
</template>
