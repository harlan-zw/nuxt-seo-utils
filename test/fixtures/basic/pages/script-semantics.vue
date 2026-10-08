<script setup lang="ts">
import { useHead } from '#imports'

useHead({
  script: [
    {
      id: 'script-semantics',
      innerHTML: [
        'globalThis.scriptSemantics = (() => {',
        String.raw`const pattern = /https?:\/\//;`,
        'const value = `url: ${pattern.source}`;',
        'const asi = (() => { return',
        '"unreachable"; })();',
        'return { matches: pattern.test("https://example.com"), asi, value };',
        '})();',
      ].join('\n'),
    },
    { id: 'custom-script', type: 'text/x-template', innerHTML: '  <div> template // literal </div>  ' },
    { id: 'script-json', type: 'application/json', innerHTML: '{ "value": "https://example.com" }' },
    { id: 'script-importmap', type: 'importmap', innerHTML: '{ "imports": { "example": "/example.js" } }' },
  ],
})
</script>

<template>
  <div>Script semantics</div>
</template>
