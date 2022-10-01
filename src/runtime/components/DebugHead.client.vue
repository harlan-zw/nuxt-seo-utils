<script lang="ts" setup>
import { nextTick, onBeforeUnmount, ref } from '#imports'

const els = ref(document.querySelectorAll('head > *'))

const tagColour = (tag: string) => {
  switch (tag) {
    case 'META':
      return '#dcfce7'
    case 'LINK':
      return '#ffedd5'
    case 'STYLE':
      return '#e9d5ff'
    case 'SCRIPT':
      return '#ccfbf1'
  }
  return '#e5e7eb'
}

let observer: MutationObserver

nextTick(() => {
  const fetchSchema = () => {
    els.value = document.querySelectorAll('head > *')
  }

  // Create an observer instance linked to the callback function
  observer = new MutationObserver(fetchSchema)

  // Start observing the target node for configured mutations
  observer.observe(document, {
    childList: true,
    characterData: true,
    attributes: true,
    subtree: true
  })

  fetchSchema()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>
<template>
  <div>
    <div style="margin: 20px; font-family: inherit, sans-serif; box-shadow: 0px 0px 12px rgba(0,0,0, 0.1); padding: 5px 20px; display: inline-block;">
      <h1 style="font-family: inherit, sans-serif;">
        DebugHead
      </h1>
      <div v-for="el in els" style="margin-bottom: 6px; padding-bottom: 6px; display: flex; align-items: center; border-bottom: 1px lightgray solid;">
        <div style="margin-right: 20px; font-size: 10px; width: 35px; text-align: center; border-radius: 4px; padding: 2px 4px; color: darkslategrey; display: inline-block;" :style="{ backgroundColor: tagColour(el.tagName) }">
          {{ el.tagName }}
        </div>
        <div v-for="(attr, key) in el.attributes" :key="key" style="display: flex; flex-direction: column; margin-right: 20px;">
          <span style="opacity: 0.6; font-size: 12px;">{{ attr.name }}</span>
          <span style="opacity: 0.9;">{{ attr.value || 'true' }}</span>
        </div>
        <div v-if="el.innerHTML" style="font-size: 12px; display: flex; flex-direction: column;">
          <div v-if="el.tagName !== 'TITLE'">
            <div style="opacity: 0.6; font-size: 12px;">
              Inline
            </div>
          </div>
          {{ el.innerHTML }}
        </div>
      </div>
    </div>
  </div>
</template>
