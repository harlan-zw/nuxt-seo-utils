<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { path as hostPath, refreshTime } from 'nuxtseo-layer-devtools/composables/state'
import { computed, ref, watch } from 'vue'
import { appFetch } from '../composables/rpc'
import { estimatePixelWidth, descColor as getDescColor, titleColor as getTitleColor, parseMetaTags, SEO_LIMITS, useLoadingMessages } from '../composables/tools'

const trailingSlashRe = /\/$/

const { copy, copied } = useClipboard()

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<ReturnType<typeof parseMetaTags> & { url: string } | null>(null)

const { current: loadingMessage, start: startMessages, stop: stopMessages } = useLoadingMessages([
  'Fetching page HTML...',
  'Parsing title and description...',
  'Extracting Open Graph tags...',
  'Checking Twitter card data...',
])

const titleLen = computed(() => result.value?.title.length || 0)
const descLen = computed(() => result.value?.description.length || 0)
const tColor = computed(() => getTitleColor(titleLen.value))
const dColor = computed(() => getDescColor(descLen.value))

const displayUrl = computed(() => {
  if (!result.value?.url)
    return ''
  try {
    const url = new URL(result.value.url)
    return url.hostname + (url.pathname === '/' ? '' : url.pathname.replace(trailingSlashRe, ''))
  }
  catch {
    return result.value.url
  }
})

const essentialTags = computed(() => {
  if (!result.value)
    return []
  return [
    { category: 'Basic', name: 'title', present: !!result.value.title, value: result.value.title },
    { category: 'Basic', name: 'description', present: !!result.value.description, value: result.value.description },
    { category: 'Basic', name: 'canonical', present: !!result.value.canonical, value: result.value.canonical },
    { category: 'Open Graph', name: 'og:title', present: !!result.value.ogTags['og:title'], value: result.value.ogTags['og:title'] },
    { category: 'Open Graph', name: 'og:description', present: !!result.value.ogTags['og:description'], value: result.value.ogTags['og:description'] },
    { category: 'Open Graph', name: 'og:image', present: !!result.value.ogTags['og:image'], value: result.value.ogTags['og:image'] },
    { category: 'Open Graph', name: 'og:url', present: !!result.value.ogTags['og:url'], value: result.value.ogTags['og:url'] },
    { category: 'Twitter', name: 'twitter:card', present: !!result.value.twitterTags['twitter:card'], value: result.value.twitterTags['twitter:card'] },
    { category: 'Twitter', name: 'twitter:title', present: !!result.value.twitterTags['twitter:title'], value: result.value.twitterTags['twitter:title'] },
    { category: 'Twitter', name: 'twitter:image', present: !!result.value.twitterTags['twitter:image'], value: result.value.twitterTags['twitter:image'] },
  ]
})

const essentialTagsByCategory = computed(() => {
  const grouped: Record<string, typeof essentialTags.value> = {}
  essentialTags.value.forEach((tag) => {
    if (!grouped[tag.category])
      grouped[tag.category] = []
    grouped[tag.category]!.push(tag)
  })
  return grouped
})

const essentialTagsScore = computed(() => {
  const present = essentialTags.value.filter(t => t.present).length
  return { present, total: essentialTags.value.length }
})

const missingTags = computed(() => {
  if (!result.value)
    return []
  const missing: { tag: string, severity: 'error' | 'warning', message: string }[] = []
  if (!result.value.title)
    missing.push({ tag: 'title', severity: 'error', message: 'No title tag found.' })
  if (!result.value.description)
    missing.push({ tag: 'meta description', severity: 'warning', message: 'Missing meta description.' })
  if (!result.value.ogTags['og:title'])
    missing.push({ tag: 'og:title', severity: 'warning', message: 'Missing og:title for social sharing.' })
  if (!result.value.ogTags['og:description'])
    missing.push({ tag: 'og:description', severity: 'warning', message: 'Missing og:description for social sharing.' })
  if (!result.value.ogTags['og:image'])
    missing.push({ tag: 'og:image', severity: 'warning', message: 'Missing og:image. Posts with images get higher click rates.' })
  if (!result.value.canonical)
    missing.push({ tag: 'canonical', severity: 'warning', message: 'Missing canonical URL.' })
  return missing
})

const overallStatus = computed(() => {
  if (!result.value)
    return null
  const hasErrors = missingTags.value.some(t => t.severity === 'error') || tColor.value === 'error' || dColor.value === 'error'
  const hasWarnings = missingTags.value.length > 0 || tColor.value === 'warning' || dColor.value === 'warning'
  if (hasErrors)
    return { type: 'error', message: 'Issues found', icon: 'carbon:warning-alt' }
  if (hasWarnings)
    return { type: 'warning', message: 'Some suggestions', icon: 'carbon:warning' }
  return { type: 'success', message: 'Looking good!', icon: 'carbon:checkmark-filled' }
})

async function checkCurrentPage() {
  loading.value = true
  error.value = null
  result.value = null
  startMessages()

  try {
    // Fetch HTML from the host app's current page
    const baseUrl = window.parent?.location?.origin || window.location.origin
    const response = await fetch(`${baseUrl}${hostPath.value}`, {
      headers: { Accept: 'text/html' },
    })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    const parsed = parseMetaTags(html)
    result.value = { ...parsed, url: `${baseUrl}${hostPath.value}` }
  }
  catch (e: any) {
    error.value = e.message || 'Failed to fetch page'
  }
  finally {
    loading.value = false
    stopMessages()
  }
}

// Auto-check when connected and route changes
watch([() => appFetch.value, hostPath, refreshTime], () => {
  if (appFetch.value)
    checkCurrentPage()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6 animate-fade-up">
    <!-- Current page indicator -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon name="carbon:tag" class="text-lg text-[var(--seo-green)]" />
        <h2 class="text-lg font-semibold">
          Meta Tag Checker
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <UBadge color="neutral" variant="subtle" class="font-mono text-xs">
          {{ hostPath }}
        </UBadge>
        <UButton
          size="xs"
          variant="ghost"
          color="neutral"
          icon="carbon:reset"
          :loading="loading"
          @click="checkCurrentPage"
        />
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="card p-8 text-center">
      <UIcon name="carbon:circle-dash" class="text-3xl text-[var(--seo-green)] animate-spin mb-3" />
      <p class="text-sm text-[var(--color-text-muted)]">
        {{ loadingMessage }}
      </p>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="card p-6 border-red-500/30">
      <div class="flex items-center gap-2 text-red-500">
        <UIcon name="carbon:warning-alt" class="text-lg" />
        <span class="font-medium">{{ error }}</span>
      </div>
    </div>

    <!-- Results -->
    <template v-else-if="result">
      <!-- Overall status -->
      <div
        class="card p-4 flex items-center gap-3"
        :class="{
          'border-green-500/30': overallStatus?.type === 'success',
          'border-amber-500/30': overallStatus?.type === 'warning',
          'border-red-500/30': overallStatus?.type === 'error',
        }"
      >
        <UIcon
          :name="overallStatus?.icon || 'carbon:checkmark'"
          class="text-xl"
          :class="{
            'text-green-500': overallStatus?.type === 'success',
            'text-amber-500': overallStatus?.type === 'warning',
            'text-red-500': overallStatus?.type === 'error',
          }"
        />
        <div>
          <p class="font-medium">
            {{ overallStatus?.message }}
          </p>
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ essentialTagsScore.present }}/{{ essentialTagsScore.total }} essential tags present
          </p>
        </div>
      </div>

      <!-- SERP Preview -->
      <div class="card p-5">
        <p class="text-xs text-[var(--color-text-muted)] font-mono mb-3">
          Google search preview
        </p>
        <div class="rounded-xl p-5 bg-white dark:bg-[#202124] border border-neutral-200 dark:border-neutral-700/50">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-7 h-7 rounded-full flex items-center justify-center bg-gray-100 dark:bg-[#303134]">
              <UIcon name="carbon:earth" class="w-4 h-4 text-gray-400" />
            </div>
            <div class="text-sm text-gray-600 dark:text-[#bdc1c6]">
              {{ displayUrl }}
            </div>
          </div>
          <h3 class="text-xl text-[#1a0dab] dark:text-[#8ab4f8] leading-snug mb-1 cursor-pointer hover:underline">
            {{ result.title || 'No title found' }}
          </h3>
          <p class="text-sm text-gray-600 dark:text-[#bdc1c6] leading-relaxed line-clamp-2">
            {{ result.description || 'No description found' }}
          </p>
        </div>
      </div>

      <!-- Title & Description lengths -->
      <div class="grid md:grid-cols-2 gap-4">
        <div class="card p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Title</span>
            <span
              class="text-xs font-mono"
              :class="{ 'text-green-400': tColor === 'success', 'text-amber-400': tColor === 'warning', 'text-red-400': tColor === 'error' }"
            >
              {{ titleLen }}/{{ SEO_LIMITS.TITLE_MAX_CHARS }} chars · ~{{ estimatePixelWidth(result.title) }}px
            </span>
          </div>
          <div class="h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-200"
              :class="{ 'bg-green-500': tColor === 'success', 'bg-amber-500': tColor === 'warning', 'bg-red-500': tColor === 'error' }"
              :style="{ width: `${Math.min(100, (titleLen / SEO_LIMITS.TITLE_MAX_CHARS) * 100)}%` }"
            />
          </div>
          <p class="text-xs text-[var(--color-text-muted)] truncate">
            {{ result.title || 'Not set' }}
          </p>
        </div>

        <div class="card p-4 space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">Description</span>
            <span
              class="text-xs font-mono"
              :class="{ 'text-green-400': dColor === 'success', 'text-amber-400': dColor === 'warning', 'text-red-400': dColor === 'error' }"
            >
              {{ descLen }}/{{ SEO_LIMITS.DESC_MAX_CHARS }} chars
            </span>
          </div>
          <div class="h-1.5 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-200"
              :class="{ 'bg-green-500': dColor === 'success', 'bg-amber-500': dColor === 'warning', 'bg-red-500': dColor === 'error' }"
              :style="{ width: `${Math.min(100, (descLen / SEO_LIMITS.DESC_MAX_CHARS) * 100)}%` }"
            />
          </div>
          <p class="text-xs text-[var(--color-text-muted)] truncate">
            {{ result.description || 'Not set' }}
          </p>
        </div>
      </div>

      <!-- Missing tags -->
      <div v-if="missingTags.length" class="card p-4 space-y-3">
        <p class="text-sm font-medium">
          Missing Tags
        </p>
        <div v-for="tag of missingTags" :key="tag.tag" class="flex items-start gap-2">
          <UIcon
            :name="tag.severity === 'error' ? 'carbon:close-filled' : 'carbon:warning-filled'"
            class="text-base mt-0.5 shrink-0"
            :class="tag.severity === 'error' ? 'text-red-500' : 'text-amber-500'"
          />
          <div>
            <span class="text-sm font-mono">{{ tag.tag }}</span>
            <p class="text-xs text-[var(--color-text-muted)]">
              {{ tag.message }}
            </p>
          </div>
        </div>
      </div>

      <!-- Essential tags checklist -->
      <div class="card p-4 space-y-4">
        <p class="text-sm font-medium">
          Essential Tags Checklist
        </p>
        <div v-for="(tags, category) of essentialTagsByCategory" :key="category" class="space-y-1">
          <p class="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
            {{ category }}
          </p>
          <div v-for="tag of tags" :key="tag.name" class="flex items-center gap-2 py-1">
            <UIcon
              :name="tag.present ? 'carbon:checkmark-filled' : 'carbon:close-filled'"
              class="text-sm"
              :class="tag.present ? 'text-green-500' : 'text-red-400'"
            />
            <span class="text-sm font-mono flex-1">{{ tag.name }}</span>
            <span v-if="tag.value" class="text-xs text-[var(--color-text-muted)] truncate max-w-[200px]">
              {{ tag.value }}
            </span>
          </div>
        </div>
      </div>

      <!-- All meta tags -->
      <div class="card p-4 space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium">
            All Meta Tags ({{ result.allMeta.length }})
          </p>
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="carbon:copy"
            :label="copied ? 'Copied!' : 'Copy JSON'"
            @click="copy(JSON.stringify({ title: result.title, description: result.description, canonical: result.canonical, og: result.ogTags, twitter: result.twitterTags }, null, 2))"
          />
        </div>
        <div class="divide-y divide-[var(--color-border-subtle)]">
          <div v-for="meta of result.allMeta" :key="meta.name" class="flex items-center gap-3 py-2">
            <UBadge :color="meta.type === 'property' ? 'primary' : meta.type === 'name' ? 'neutral' : 'warning'" variant="subtle" size="xs">
              {{ meta.type }}
            </UBadge>
            <span class="text-sm font-mono shrink-0">{{ meta.name }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate">{{ meta.content }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Not connected -->
    <div v-else class="card p-8 text-center">
      <UIcon name="carbon:plug" class="text-3xl text-[var(--color-text-muted)] mb-3" />
      <p class="text-sm text-[var(--color-text-muted)]">
        Waiting for connection to host app...
      </p>
    </div>
  </div>
</template>
