<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { data } from '../composables/state'
import { parseMetaTags } from '../composables/tools'

const { copy, copied } = useClipboard()

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

  if (result.value.ogImages.length) {
    const img = result.value.ogImages[0]!
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

const ogTagCount = computed(() => result.value ? Object.keys(result.value.og).length : 0)
const twitterTagCount = computed(() => result.value ? Object.keys(result.value.twitter).length : 0)

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

async function checkSocial() {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const baseUrl = window.parent?.location?.origin || window.location.origin
    const fullUrl = `${baseUrl}${path.value}`
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
  }
}

watch([() => data.value, path, refreshTime], () => {
  if (data.value)
    checkSocial()
}, { immediate: true })
</script>

<template>
  <div class="space-y-5 stagger-children">
    <!-- Loading -->
    <DevtoolsLoading v-if="loading" />

    <!-- Error -->
    <DevtoolsError v-else-if="error" :error="error" title="Failed to check page">
      <UButton size="sm" variant="ghost" icon="carbon:reset" label="Retry" @click="checkSocial" />
    </DevtoolsError>

    <!-- Results -->
    <template v-else-if="result">
      <!-- Warnings -->
      <DevtoolsSection v-if="warnings.length" icon="carbon:warning" text="Warnings">
        <template #actions>
          <DevtoolsMetric
            :value="warnings.filter(w => w.type === 'error').length"
            label="errors"
            :variant="warnings.some(w => w.type === 'error') ? 'danger' : undefined"
          />
          <DevtoolsMetric
            :value="warnings.filter(w => w.type === 'warning').length"
            label="warnings"
            :variant="warnings.some(w => w.type === 'warning') ? 'warning' : undefined"
          />
        </template>
        <div class="space-y-1">
          <div v-for="w of warnings" :key="w.property + w.message" class="social-issue-row">
            <UIcon
              :name="w.type === 'error' ? 'carbon:close-filled' : 'carbon:warning-filled'"
              class="mt-0.5 shrink-0"
              :class="w.type === 'error' ? 'text-red-500' : 'text-amber-500'"
            />
            <div class="min-w-0">
              <span class="font-mono text-xs">{{ w.property }}</span>
              <p class="text-xs text-[var(--color-text-muted)]">
                {{ w.message }}
              </p>
            </div>
          </div>
        </div>
      </DevtoolsSection>

      <!-- Preview tabs -->
      <DevtoolsSection icon="carbon:view" text="Social Preview" :padding="false">
        <div class="social-tab-bar">
          <button
            v-for="tab of previewTabs"
            :key="tab.value"
            class="social-tab"
            :class="{ 'social-tab--active': activePreview === tab.value }"
            @click="activePreview = tab.value"
          >
            <UIcon :name="tab.icon" class="text-sm" />
            <span class="social-tab__label">{{ tab.label }}</span>
          </button>
        </div>

        <div class="social-preview-stage">
          <!-- Twitter preview -->
          <div v-if="activePreview === 'twitter'" class="social-preview-card">
            <div class="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div v-else class="social-image-placeholder aspect-[1.91/1]">
                <UIcon name="carbon:image" class="text-2xl" />
                <span>No og:image</span>
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
          <div v-if="activePreview === 'facebook'" class="social-preview-card">
            <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-700">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div v-else class="social-image-placeholder aspect-[1.91/1]">
                <UIcon name="carbon:image" class="text-2xl" />
                <span>No og:image</span>
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
          <div v-if="activePreview === 'linkedin'" class="social-preview-card">
            <div class="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
              <div v-if="previewImage" class="aspect-[1.91/1] bg-neutral-100 dark:bg-neutral-800">
                <img :src="previewImage" class="w-full h-full object-cover" :alt="previewTitle">
              </div>
              <div v-else class="social-image-placeholder aspect-[1.91/1]">
                <UIcon name="carbon:image" class="text-2xl" />
                <span>No og:image</span>
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
          <div v-if="activePreview === 'discord'" class="social-preview-card">
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
              <div v-else class="social-image-placeholder social-image-placeholder--discord mt-3 max-w-[300px] aspect-video rounded-lg">
                <UIcon name="carbon:image" class="text-xl" />
                <span>No image</span>
              </div>
            </div>
          </div>

          <!-- Slack preview -->
          <div v-if="activePreview === 'slack'" class="social-preview-card">
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
      </DevtoolsSection>

      <!-- OG Tags table -->
      <DevtoolsSection icon="carbon:tag-group" text="Open Graph Tags">
        <template #actions>
          <DevtoolsMetric :value="ogTagCount" label="og" />
          <DevtoolsMetric :value="twitterTagCount" label="twitter" />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="carbon:copy"
            :label="copied ? 'Copied!' : 'Copy'"
            @click="copy(JSON.stringify({ og: result.og, twitter: result.twitter }, null, 2))"
          />
        </template>
        <div class="social-tags-table">
          <div v-for="(value, key) of result.og" :key="key" class="social-tags-table__row">
            <UBadge color="primary" variant="subtle" size="xs">
              og
            </UBadge>
            <span class="text-sm font-mono shrink-0 text-[var(--color-text)]">{{ key }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate min-w-0 flex-1 text-right font-mono">{{ value }}</span>
          </div>
          <div v-for="(value, key) of result.twitter" :key="key" class="social-tags-table__row">
            <UBadge color="neutral" variant="subtle" size="xs">
              twitter
            </UBadge>
            <span class="text-sm font-mono shrink-0 text-[var(--color-text)]">{{ key }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate min-w-0 flex-1 text-right font-mono">{{ value }}</span>
          </div>
        </div>
      </DevtoolsSection>

      <!-- OG Image preview -->
      <DevtoolsSection v-if="result.ogImages.length" icon="carbon:image" text="OG Image">
        <template #actions>
          <DevtoolsMetric
            v-if="result.ogImages[0]?.width && result.ogImages[0]?.height"
            :value="`${result.ogImages[0].width}×${result.ogImages[0].height}`"
            label="px"
          />
        </template>
        <div v-for="(img, i) of result.ogImages" :key="i" class="space-y-2">
          <div class="rounded-lg overflow-hidden border border-[var(--color-border)]">
            <img :src="img.url" class="w-full max-h-64 object-contain bg-neutral-100 dark:bg-neutral-800" :alt="img.alt || 'OG Image'">
          </div>
          <div class="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-mono">
            <span class="truncate">{{ img.url }}</span>
          </div>
        </div>
      </DevtoolsSection>
    </template>

    <!-- Not connected -->
    <DevtoolsEmptyState
      v-else-if="!loading && !error"
      icon="carbon:share"
      title="Waiting for connection"
      description="Waiting for connection to host app..."
    />
  </div>
</template>

<style scoped>
/* Issue rows */
.social-issue-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  transition: background 150ms;
}

.social-issue-row:hover {
  background: var(--color-surface-sunken);
}

/* Platform tabs */
.social-tab-bar {
  display: flex;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  overflow-x: auto;
}

.social-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  white-space: nowrap;
  transition: color 150ms, background 150ms;
}

.social-tab:hover {
  color: var(--color-text);
  background: var(--color-surface-sunken);
}

.social-tab--active {
  color: var(--seo-green);
  background: oklch(65% 0.2 145 / 0.08);
}

.dark .social-tab--active {
  background: oklch(65% 0.2 145 / 0.12);
}

.social-tab__label {
  display: none;
}

@media (min-width: 640px) {
  .social-tab__label {
    display: inline;
  }
}

/* Preview stage */
.social-preview-stage {
  padding: 1.5rem;
}

.social-preview-card {
  max-width: 500px;
  margin: 0 auto;
  animation: fade-up 250ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

/* Image placeholder */
.social-image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle);
  font-size: 0.6875rem;
  font-weight: 500;
  background-image:
    linear-gradient(45deg, oklch(0% 0 0 / 0.03) 25%, transparent 25%),
    linear-gradient(-45deg, oklch(0% 0 0 / 0.03) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, oklch(0% 0 0 / 0.03) 75%),
    linear-gradient(-45deg, transparent 75%, oklch(0% 0 0 / 0.03) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.dark .social-image-placeholder {
  background-image:
    linear-gradient(45deg, oklch(100% 0 0 / 0.03) 25%, transparent 25%),
    linear-gradient(-45deg, oklch(100% 0 0 / 0.03) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, oklch(100% 0 0 / 0.03) 75%),
    linear-gradient(-45deg, transparent 75%, oklch(100% 0 0 / 0.03) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0;
}

.social-image-placeholder--discord {
  background-color: #36393f;
  color: #72767d;
}

/* Tags table */
.social-tags-table__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-sm);
  transition: background 150ms;
}

.social-tags-table__row:hover {
  background: var(--color-surface-sunken);
}

.social-tags-table__row:nth-child(even) {
  background: oklch(0% 0 0 / 0.015);
}

.dark .social-tags-table__row:nth-child(even) {
  background: oklch(100% 0 0 / 0.015);
}

.social-tags-table__row:nth-child(even):hover {
  background: var(--color-surface-sunken);
}
</style>
