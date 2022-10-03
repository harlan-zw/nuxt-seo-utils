<script lang="ts" setup>
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

  observer.observe(document, {
    // this is aggressive and non-performant, but it's just for debugging
    childList: true,
    characterData: true,
    attributes: true,
    subtree: true,
  })

  fetchSchema()
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div class="debug-head">
    <p>DebugHead</p>
    <div v-for="el in els" class="debug-head__inner">
      <div class="debug-head__tag" :style="{ backgroundColor: tagColour(el.tagName) }">
        {{ el.tagName }}
      </div>
      <div v-for="(attr, key) in el.attributes" :key="key" class="debug-head__attr">
        <span style="opacity: 0.6; font-size: 12px;">{{ attr.name }}</span>
        <span style="opacity: 0.9;">{{ attr.value || 'true' }}</span>
      </div>
      <div v-if="el.innerHTML" class="debug-head__html">
        <div v-if="el.tagName !== 'TITLE'">
          <div style="opacity: 0.6; font-size: 12px;">
            Inline
          </div>
        </div>
        {{ el.innerHTML }}
      </div>
    </div>
  </div>
</template>

<style>
.debug-head {
  margin: 20px;
  font-family: inherit, sans-serif;
  box-shadow: 0px 0px 12px rgba(0,0,0, 0.1);
  font-size: 0.9em;
  padding: 5px 20px;
  display: inline-block;
  max-width: 900px;
  border-radius: 20px;
}

.debug-head__inner {
  margin-bottom: 6px;
  padding-bottom: 10px;
  padding-top: 5px;
  display: flex;
  border-bottom: 1px #d3d3d352 solid;
}

.debug-head__tag {
  margin-right: 20px;
  font-size: 10px;
  width: 35px;
  text-align: center;
  border-radius: 4px;
  padding: 2px 4px;
  color: darkslategrey;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-basis: 35px;
}

.debug-head__attr {
  display: flex;
  flex-direction: column;
  margin-right: 20px;
}

.debug-head__html {
  display: flex;
  flex-direction: column;
}
</style>
