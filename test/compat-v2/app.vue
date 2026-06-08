<script setup lang="ts">
// exercises the cross-major head paths on the unhead v2 stack:
// - useSeoMeta input feeds the InferSeoMetaPlugin (og:* / twitter:* inference)
// - the module's default titleTemplate ('%s %separator %siteName') resolves via
//   the TemplateParamsPlugin against the site-config templateParams
useSeoMeta({
  title: 'Hello v2',
  description: 'inferred description on the unhead v2 stack',
})
</script>

<template>
  <div>
    <NuxtPage />
  </div>
</template>
