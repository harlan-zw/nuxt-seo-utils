<script lang="ts" setup>
import { computed, useHead, useRoute, watchEffect } from '#imports'
import { useAsyncData } from 'nuxt/app'
import { appFetch, colorMode } from './composables/rpc'
import { hasProductionUrl, path as hostPath, isProductionMode, previewSource, productionUrl } from './util/logic'

const { data: debugData } = await useAsyncData('seo-utils-debug', async () => {
  if (!appFetch.value)
    return null
  return appFetch.value('/__nuxt-seo-utils/debug.json')
}, { watch: [appFetch] })

watchEffect(() => {
  if (debugData.value?.siteConfig?.url)
    productionUrl.value = debugData.value.siteConfig.url
})

const isDark = computed(() => colorMode.value === 'dark')
useHead({
  title: 'Nuxt SEO Utils',
  htmlAttrs: {
    class: () => isDark.value ? 'dark' : '',
  },
})

const route = useRoute()
const currentTab = computed(() => {
  if (route.path === '/social')
    return 'social'
  return 'meta'
})

const navItems = [
  { value: 'meta', to: '/', icon: 'carbon:tag', label: 'Meta Tags' },
  { value: 'social', to: '/social', icon: 'carbon:share', label: 'Social' },
]

const connectionReady = computed(() => !!appFetch.value)

const productionHostname = computed(() => {
  try {
    return new URL(productionUrl.value).hostname
  }
  catch {
    return productionUrl.value
  }
})
</script>

<template>
  <UApp>
    <div class="relative bg-base flex flex-col min-h-screen">
      <div class="gradient-bg" />

      <!-- Header -->
      <header class="header glass sticky top-0 z-50">
        <div class="header-content">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3 sm:gap-4">
            <a
              href="https://nuxtseo.com"
              target="_blank"
              class="flex items-center opacity-90 hover:opacity-100 transition-opacity"
            >
              <NuxtSeoLogo class="h-6 sm:h-7" />
            </a>

            <div class="divider" />

            <div class="flex items-center gap-2">
              <div class="brand-icon">
                <UIcon name="carbon:search-locate" class="text-base sm:text-lg" />
              </div>
              <h1 class="text-sm sm:text-base font-semibold tracking-tight text-[var(--color-text)]">
                SEO Utils
              </h1>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex items-center gap-1 sm:gap-2">
            <div class="nav-tabs">
              <NuxtLink
                v-for="item of navItems"
                :key="item.value"
                :to="item.to"
                class="nav-tab"
                :class="[currentTab === item.value ? 'active' : '']"
              >
                <UTooltip :text="item.label" :delay-duration="300">
                  <div class="nav-tab-inner">
                    <UIcon
                      :name="item.icon"
                      class="text-base sm:text-lg"
                      :class="currentTab === item.value ? 'text-[var(--seo-green)]' : ''"
                    />
                    <span class="nav-label">{{ item.label }}</span>
                  </div>
                </UTooltip>
              </NuxtLink>
            </div>

            <!-- Preview source toggle -->
            <div v-if="hasProductionUrl" class="preview-source-toggle">
              <button
                class="preview-source-btn"
                :class="{ active: previewSource === 'local' }"
                @click="previewSource = 'local'"
              >
                <UIcon name="carbon:laptop" class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Local</span>
              </button>
              <button
                class="preview-source-btn"
                :class="{ active: previewSource === 'production' }"
                @click="previewSource = 'production'"
              >
                <UIcon name="carbon:cloud" class="w-3.5 h-3.5" />
                <span class="hidden sm:inline">Production</span>
              </button>
            </div>

            <!-- Production URL indicator -->
            <UTooltip v-if="isProductionMode" :text="productionUrl" :delay-duration="200">
              <span class="production-url-badge">
                <span class="production-url-dot" />
                <span class="hidden sm:inline text-xs">{{ productionHostname }}</span>
              </span>
            </UTooltip>

            <!-- Connection indicator -->
            <div class="flex items-center gap-1">
              <UTooltip :text="connectionReady ? `Monitoring ${hostPath}` : 'Connecting...'" :delay-duration="300">
                <div
                  class="w-2 h-2 rounded-full transition-colors"
                  :class="connectionReady ? 'bg-green-500' : 'bg-amber-500 animate-pulse'"
                />
              </UTooltip>
            </div>
          </nav>
        </div>
      </header>

      <!-- Main Content -->
      <div class="main-content">
        <main class="mx-auto flex flex-col w-full max-w-7xl">
          <NuxtPage />
        </main>
      </div>
    </div>
  </UApp>
</template>

<style>
.header {
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 1rem;
  max-width: 80rem;
  margin: 0 auto;
  width: 100%;
}

@media (min-width: 640px) {
  .header-content {
    padding: 0.75rem 1.25rem;
  }
}

.divider {
  width: 1px;
  height: 1.25rem;
  background: var(--color-border);
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--radius-sm);
  background: oklch(65% 0.2 145 / 0.12);
  color: var(--seo-green);
}

.nav-tabs {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  padding: 0.25rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
}

.nav-tab {
  position: relative;
  border-radius: var(--radius-sm);
  transition: background 150ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 150ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-tab-inner {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
}

@media (min-width: 640px) {
  .nav-tab-inner {
    padding: 0.375rem 0.75rem;
  }
}

.nav-tab:hover .nav-tab-inner {
  color: var(--color-text);
}

.nav-tab.active {
  background: var(--color-surface-elevated);
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.08);
}

.dark .nav-tab.active {
  box-shadow: 0 1px 3px oklch(0% 0 0 / 0.3);
}

.nav-tab.active .nav-tab-inner {
  color: var(--color-text);
}

.nav-label {
  display: none;
}

@media (min-width: 640px) {
  .nav-label {
    display: inline;
  }
}

/* Preview source toggle */
.preview-source-toggle {
  display: flex;
  gap: 1px;
  background: var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.preview-source-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-sunken);
  border: none;
  cursor: pointer;
  transition: color 150ms, background 150ms;
  white-space: nowrap;
}

.preview-source-btn:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.preview-source-btn.active {
  color: var(--color-text);
  background: var(--color-surface-elevated);
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.06);
}

.dark .preview-source-btn.active {
  box-shadow: 0 1px 2px oklch(0% 0 0 / 0.2);
}

/* Production URL badge */
.production-url-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  background: oklch(85% 0.12 145 / 0.12);
  color: oklch(45% 0.15 145);
  font-weight: 500;
  font-family: var(--font-mono, ui-monospace, monospace);
}

.dark .production-url-badge {
  background: oklch(35% 0.08 145 / 0.2);
  color: oklch(75% 0.12 145);
}

.production-url-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: oklch(65% 0.2 145);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  min-height: calc(100vh - 60px);
}

@media (min-width: 640px) {
  .main-content {
    padding: 1rem;
  }
}

html {
  font-family: var(--font-sans);
  overflow-y: scroll;
  overscroll-behavior: none;
}

body {
  min-height: 100vh;
}

html.dark {
  color-scheme: dark;
}

textarea {
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

textarea:focus-visible {
  border-color: var(--seo-green);
  outline: none;
}
</style>
