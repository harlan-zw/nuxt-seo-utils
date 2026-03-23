<script setup lang="ts">
import { path as hostPath, isProductionMode, productionUrl, refreshTime } from '#imports'
import { computed, ref, watch } from 'vue'
import { appFetch } from '../composables/rpc'
import { parseMetaTags, useLoadingMessages } from '../composables/tools'

const TRAILING_SLASH_RE = /\/$/

const loading = ref(false)
const error = ref<string | null>(null)

interface ParsedSocialMeta {
  title: string
  description: string
  url: string
  siteName: string
  og: Record<string, string>
  ogImages: Array<{ url: string, width?: string, height?: string, alt?: string }>
  twitter: Record<string, string>
  twitterCard: string
}

const result = ref<ParsedSocialMeta | null>(null)
const activePreview = ref('twitter')

const { current: loadingMessage, start: startMessages, stop: stopMessages } = useLoadingMessages([
  'Fetching page HTML...',
  'Extracting Open Graph tags...',
  'Checking Twitter card data...',
  'Analyzing social previews...',
])

const previewTabs = [
  { label: 'X / Twitter', value: 'twitter', icon: 'carbon:logo-x' },
  { label: 'Facebook', value: 'facebook', icon: 'carbon:logo-facebook' },
  { label: 'LinkedIn', value: 'linkedin', icon: 'carbon:logo-linkedin' },
  { label: 'Discord', value: 'discord', icon: 'carbon:logo-discord' },
  { label: 'Slack', value: 'slack', icon: 'carbon:logo-slack' },
]

const warnings = computed(() => {
  if (!result.value)
    return []
  const w: Array<{ type: 'error' | 'warning', property: string, message: string }> = []

  if (!result.value.og['og:title'])
    w.push({ type: 'warning', property: 'og:title', message: 'Missing og:title. Social previews will use the page title as fallback.' })
  if (!result.value.og['og:description'])
    w.push({ type: 'warning', property: 'og:description', message: 'Missing og:description.' })
  if (!result.value.ogImages.length)
    w.push({ type: 'warning', property: 'og:image', message: 'No og:image found. Posts with images get higher engagement.' })
  if (!result.value.og['og:url'])
    w.push({ type: 'warning', property: 'og:url', message: 'Missing og:url.' })
  if (!result.value.twitter['twitter:card'])
    w.push({ type: 'warning', property: 'twitter:card', message: 'Missing twitter:card. Defaults to "summary".' })

  // Image validation
  if (result.value.ogImages.length) {
    const img = result.value.ogImages[0]
    if (img.url && !img.url.startsWith('http'))
      w.push({ type: 'error', property: 'og:image', message: 'og:image must be an absolute URL.' })
    const width = Number.parseInt(img.width || '0')
    const height = Number.parseInt(img.height || '0')
    if (width && height && (width < 200 || height < 200))
      w.push({ type: 'warning', property: 'og:image', message: `Image is ${width}x${height}. Minimum recommended: 200x200, ideal: 1200x630.` })
  }

  return w
})

const previewTitle = computed(() =>
  result.value?.og['og:title'] || result.value?.twitter['twitter:title'] || result.value?.title || 'Untitled',
)

const previewDescription = computed(() =>
  result.value?.og['og:description'] || result.value?.twitter['twitter:description'] || result.value?.description || '',
)

const previewImage = computed(() =>
  result.value?.ogImages[0]?.url || result.value?.twitter['twitter:image'] || null,
)

const previewSiteName = computed(() => {
  if (result.value?.og['og:site_name'])
    return result.value.og['og:site_name']
  try {
    return new URL(result.value?.url || '').hostname
  }
  catch {
    return ''
  }
})

function parseSocialMeta(html: string, url: string): ParsedSocialMeta {
  const parsed = parseMetaTags(html)

  const ogImages: ParsedSocialMeta['ogImages'] = []
  if (parsed.ogTags['og:image']) {
    ogImages.push({
      url: parsed.ogTags['og:image'],
      width: parsed.ogTags['og:image:width'],
      height: parsed.ogTags['og:image:height'],
      alt: parsed.ogTags['og:image:alt'],
    })
  }

  let hostname = ''
  try {
    hostname = new URL(url).hostname
  }
  catch {
    hostname = url
  }

  return {
    title: parsed.title,
    description: parsed.description,
    url,
    siteName: parsed.ogTags['og:site_name'] || hostname,
    og: parsed.ogTags,
    ogImages,
    twitter: parsed.twitterTags,
    twitterCard: parsed.twitterTags['twitter:card'] || 'summary',
  }
}

function resolveBaseUrl() {
  if (isProductionMode.value && productionUrl.value)
    return productionUrl.value.replace(TRAILING_SLASH_RE, '')
  return window.parent?.location?.origin || window.location.origin
}

async function checkSocial() {
  loading.value = true
  error.value = null
  result.value = null
  startMessages()

  try {
    const baseUrl = resolveBaseUrl()
    const fullUrl = `${baseUrl}${hostPath.value}`
    const response = await fetch(fullUrl, { headers: { Accept: 'text/html' } })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    result.value = parseSocialMeta(html, fullUrl)
  }
  catch (e: any) {
    error.value = e.message || 'Failed to fetch page'
  }
  finally {
    loading.value = false
    stopMessages()
  }
}

watch([() => appFetch.value, hostPath, refreshTime, isProductionMode], () => {
  if (appFetch.value)
    checkSocial()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6 animate-fade-up">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <UIcon name="carbon:share" class="text-lg text-[var(--seo-green)]" />
        <h2 class="text-lg font-semibold">
          Social Share Debugger
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
          @click="checkSocial"
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
    <DevtoolsEmptyState v-else-if="error" variant="error" :title="error" icon="carbon:warning-alt" />

    <!-- Results -->
    <template v-else-if="result">
      <!-- Warnings -->
      <template v-if="warnings.length">
        <DevtoolsAlert
          v-for="w of warnings"
          :key="w.property + w.message"
          variant="warning"
        >
          <span class="font-mono text-xs">{{ w.property }}</span> {{ w.message }}
        </DevtoolsAlert>
      </template>

      <!-- Preview tabs -->
      <div class="card overflow-hidden">
        <div class="flex border-b border-[var(--color-border)]">
          <button
            v-for="tab of previewTabs"
            :key="tab.value"
            class="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors"
            :class="activePreview === tab.value ? 'text-[var(--seo-green)] border-b-2 border-[var(--seo-green)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'"
            @click="activePreview = tab.value"
          >
            <UIcon :name="tab.icon" />
            {{ tab.label }}
          </button>
        </div>

        <div class="p-6">
          <!-- Twitter preview -->
          <div v-if="activePreview === 'twitter'" class="max-w-[500px] mx-auto">
            <div class="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div class="p-3">
                <p class="text-xs text-neutral-500">
                  {{ previewSiteName }}
                </p>
                <p class="text-sm font-medium line-clamp-1">
                  {{ previewTitle }}
                </p>
                <p class="text-xs text-neutral-500 line-clamp-2">
                  {{ previewDescription }}
                </p>
              </div>
            </div>
          </div>

          <!-- Facebook preview -->
          <div v-if="activePreview === 'facebook'" class="max-w-[500px] mx-auto">
            <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-700">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div class="p-3">
                <p class="text-[11px] text-neutral-500 uppercase tracking-wider">
                  {{ previewSiteName }}
                </p>
                <p class="text-base font-semibold line-clamp-1 mt-0.5">
                  {{ previewTitle }}
                </p>
                <p class="text-sm text-neutral-500 line-clamp-1 mt-0.5">
                  {{ previewDescription }}
                </p>
              </div>
            </div>
          </div>

          <!-- LinkedIn preview -->
          <div v-if="activePreview === 'linkedin'" class="max-w-[500px] mx-auto">
            <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div class="p-3 bg-neutral-50 dark:bg-neutral-800">
                <p class="text-sm font-semibold line-clamp-2">
                  {{ previewTitle }}
                </p>
                <p class="text-xs text-neutral-500 mt-1">
                  {{ previewSiteName }}
                </p>
              </div>
            </div>
          </div>

          <!-- Discord preview -->
          <div v-if="activePreview === 'discord'" class="max-w-[500px] mx-auto">
            <div class="rounded-lg overflow-hidden border-l-4 border-[#5865F2] bg-[#2f3136] text-white p-4">
              <p class="text-xs text-neutral-400 mb-1">
                {{ previewSiteName }}
              </p>
              <p class="text-[#00aff4] text-sm font-semibold hover:underline cursor-pointer">
                {{ previewTitle }}
              </p>
              <p class="text-sm text-neutral-300 mt-1 line-clamp-2">
                {{ previewDescription }}
              </p>
              <div v-if="previewImage" class="mt-3 rounded-lg overflow-hidden max-w-[300px]">
                <img :src="previewImage" class="w-full object-cover" :alt="previewTitle">
              </div>
            </div>
          </div>

          <!-- Slack preview -->
          <div v-if="activePreview === 'slack'" class="max-w-[500px] mx-auto">
            <div class="rounded-lg overflow-hidden border-l-4 border-neutral-300 dark:border-neutral-600 pl-4 py-2">
              <p class="text-xs text-neutral-500 font-bold mb-1">
                {{ previewSiteName }}
              </p>
              <p class="text-[#1264a3] dark:text-[#1d9bd1] text-sm font-bold hover:underline cursor-pointer">
                {{ previewTitle }}
              </p>
              <p class="text-sm text-neutral-600 dark:text-neutral-400 mt-0.5 line-clamp-2">
                {{ previewDescription }}
              </p>
              <div v-if="previewImage" class="mt-2 rounded overflow-hidden max-w-[360px]">
                <img :src="previewImage" class="w-full object-cover" :alt="previewTitle">
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- OG Tags table -->
      <div class="card p-4 space-y-3">
        <DevtoolsToolbar>
          <span class="text-sm font-medium">Open Graph Tags</span>
          <div class="flex-1" />
          <DevtoolsCopyButton :text="JSON.stringify({ og: result.og, twitter: result.twitter }, null, 2)" />
        </DevtoolsToolbar>
        <div class="divide-y divide-[var(--color-border-subtle)]">
          <div v-for="(value, key) of result.og" :key="key" class="flex items-center gap-3 py-2">
            <UBadge color="primary" variant="subtle" size="xs">
              og
            </UBadge>
            <span class="text-sm font-mono shrink-0">{{ key }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate">{{ value }}</span>
          </div>
          <div v-for="(value, key) of result.twitter" :key="key" class="flex items-center gap-3 py-2">
            <UBadge color="neutral" variant="subtle" size="xs">
              twitter
            </UBadge>
            <span class="text-sm font-mono shrink-0">{{ key }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate">{{ value }}</span>
          </div>
        </div>
      </div>

      <!-- OG Image preview -->
      <div v-if="result.ogImages.length" class="card p-4 space-y-3">
        <DevtoolsToolbar>
          <span class="text-sm font-medium">OG Image</span>
        </DevtoolsToolbar>
        <div v-for="(img, i) of result.ogImages" :key="i" class="space-y-2">
          <div class="rounded-lg overflow-hidden border border-[var(--color-border)]">
            <img :src="img.url" class="w-full max-h-64 object-contain bg-neutral-100 dark:bg-neutral-800" :alt="img.alt || 'OG Image'">
          </div>
          <div class="flex gap-4 text-xs text-[var(--color-text-muted)]">
            <span v-if="img.width && img.height">{{ img.width }}x{{ img.height }}</span>
            <span class="truncate">{{ img.url }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Not connected -->
    <DevtoolsEmptyState v-else-if="!loading && !error" title="Waiting for connection" description="Waiting for connection to host app..." icon="carbon:share" />
  </div>
</template>
