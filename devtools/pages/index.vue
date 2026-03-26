<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { data } from '../composables/state'
import { estimatePixelWidth, descColor as getDescColor, titleColor as getTitleColor, parseMetaTags, SEO_LIMITS } from '../composables/tools'

const trailingSlashRe = /\/$/

const { copy, copied } = useClipboard()

const loading = ref(false)
const error = ref<string | null>(null)
const result = ref<ReturnType<typeof parseMetaTags> & { url: string } | null>(null)

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
    { category: 'Twitter', name: 'twitter:title', present: !!result.value.twitterTags['twitter:title'], value: result.value.twitterTags['twitter:title'], fallback: result.value.ogTags['og:title'] ? 'og:title' : undefined },
    { category: 'Twitter', name: 'twitter:image', present: !!result.value.twitterTags['twitter:image'], value: result.value.twitterTags['twitter:image'], fallback: result.value.ogTags['og:image'] ? 'og:image' : undefined },
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
  const present = essentialTags.value.filter(t => t.present || t.fallback).length
  return { present, total: essentialTags.value.length }
})

const scorePercent = computed(() => {
  const { present, total } = essentialTagsScore.value
  return total > 0 ? Math.round((present / total) * 100) : 0
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
    return { variant: 'warning' as const, message: 'Issues found', icon: 'carbon:warning-alt' }
  if (hasWarnings)
    return { variant: 'warning' as const, message: 'Some suggestions', icon: 'carbon:warning' }
  return { variant: 'success' as const, message: 'Looking good!', icon: 'carbon:checkmark-filled' }
})

function lengthStatusLabel(color: string): string {
  if (color === 'success')
    return 'Good'
  if (color === 'warning')
    return 'Needs work'
  return 'Too long'
}

async function checkCurrentPage() {
  loading.value = true
  error.value = null
  result.value = null

  try {
    const baseUrl = window.parent?.location?.origin || window.location.origin
    const response = await fetch(`${baseUrl}${path.value}`, {
      headers: { Accept: 'text/html' },
    })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    const parsed = parseMetaTags(html)
    result.value = { ...parsed, url: `${baseUrl}${path.value}` }
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
    checkCurrentPage()
}, { immediate: true })
</script>

<template>
  <div class="space-y-5 stagger-children">
    <!-- Loading -->
    <DevtoolsLoading v-if="loading" />

    <!-- Error -->
    <DevtoolsError v-else-if="error" :error="error" title="Failed to check page">
      <UButton size="sm" variant="ghost" icon="carbon:reset" label="Retry" @click="checkCurrentPage" />
    </DevtoolsError>

    <!-- Results -->
    <template v-else-if="result">
      <!-- Overall status with score ring -->
      <div class="seo-status-card" :class="`seo-status-card--${overallStatus?.variant}`">
        <div class="seo-score-ring">
          <svg viewBox="0 0 36 36" class="seo-score-ring__svg">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border-subtle)" stroke-width="2.5" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              class="seo-score-ring__progress"
              :class="`seo-score-ring__progress--${overallStatus?.variant}`"
              stroke-width="2.5"
              stroke-linecap="round"
              :stroke-dasharray="`${scorePercent * 0.974}, 100`"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span class="seo-score-ring__text">{{ essentialTagsScore.present }}<span class="seo-score-ring__separator">/</span>{{ essentialTagsScore.total }}</span>
        </div>
        <div>
          <p class="font-medium text-sm">
            {{ overallStatus?.message }}
          </p>
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ essentialTagsScore.present }} of {{ essentialTagsScore.total }} essential tags present
          </p>
        </div>
      </div>

      <!-- SERP Preview -->
      <DevtoolsSection icon="carbon:search" text="Google Search Preview">
        <div class="serp-preview-container">
          <div class="serp-preview">
            <div class="flex items-center gap-3 mb-2">
              <div class="serp-preview__favicon">
                <UIcon name="carbon:earth" class="w-3.5 h-3.5 text-gray-400" />
              </div>
              <div>
                <div class="text-xs text-gray-600 dark:text-[#bdc1c6] leading-tight">
                  {{ displayUrl }}
                </div>
              </div>
            </div>
            <h3 class="serp-preview__title">
              {{ result.title || 'No title found' }}
            </h3>
            <p class="serp-preview__description">
              {{ result.description || 'No description found' }}
            </p>
          </div>
        </div>
      </DevtoolsSection>

      <!-- Title & Description lengths -->
      <div class="grid md:grid-cols-2 gap-4">
        <DevtoolsSection icon="carbon:text-short-paragraph" text="Title" :collapse="false">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="seo-length-status" :class="`seo-length-status--${tColor}`">
                {{ lengthStatusLabel(tColor) }}
              </span>
              <span class="text-xs font-mono text-[var(--color-text-muted)]">
                {{ titleLen }}/{{ SEO_LIMITS.TITLE_MAX_CHARS }} chars · ~{{ estimatePixelWidth(result.title) }}px
              </span>
            </div>
            <div class="seo-progress-track">
              <div
                class="seo-progress-fill"
                :class="`seo-progress-fill--${tColor}`"
                :style="{ width: `${Math.min(100, (titleLen / SEO_LIMITS.TITLE_MAX_CHARS) * 100)}%` }"
              />
              <div class="seo-progress-marker" :style="{ left: `${(30 / SEO_LIMITS.TITLE_MAX_CHARS) * 100}%` }" />
            </div>
            <p class="text-xs text-[var(--color-text-muted)] truncate">
              {{ result.title || 'Not set' }}
            </p>
          </div>
        </DevtoolsSection>

        <DevtoolsSection icon="carbon:text-long-paragraph" text="Description" :collapse="false">
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <span class="seo-length-status" :class="`seo-length-status--${dColor}`">
                {{ lengthStatusLabel(dColor) }}
              </span>
              <span class="text-xs font-mono text-[var(--color-text-muted)]">
                {{ descLen }}/{{ SEO_LIMITS.DESC_MAX_CHARS }} chars
              </span>
            </div>
            <div class="seo-progress-track">
              <div
                class="seo-progress-fill"
                :class="`seo-progress-fill--${dColor}`"
                :style="{ width: `${Math.min(100, (descLen / SEO_LIMITS.DESC_MAX_CHARS) * 100)}%` }"
              />
              <div class="seo-progress-marker" :style="{ left: `${(SEO_LIMITS.DESC_WARN_CHARS / SEO_LIMITS.DESC_MAX_CHARS) * 100}%` }" />
            </div>
            <p class="text-xs text-[var(--color-text-muted)] truncate">
              {{ result.description || 'Not set' }}
            </p>
          </div>
        </DevtoolsSection>
      </div>

      <!-- Missing tags -->
      <DevtoolsSection v-if="missingTags.length" icon="carbon:warning" text="Missing Tags">
        <template #actions>
          <DevtoolsMetric
            :value="missingTags.filter(t => t.severity === 'error').length"
            label="errors"
            :variant="missingTags.some(t => t.severity === 'error') ? 'danger' : undefined"
          />
          <DevtoolsMetric
            :value="missingTags.filter(t => t.severity === 'warning').length"
            label="warnings"
            :variant="missingTags.some(t => t.severity === 'warning') ? 'warning' : undefined"
          />
        </template>
        <div class="space-y-1">
          <div v-for="tag of missingTags" :key="tag.tag" class="seo-issue-row">
            <UIcon
              :name="tag.severity === 'error' ? 'carbon:close-filled' : 'carbon:warning-filled'"
              class="text-base mt-0.5 shrink-0"
              :class="tag.severity === 'error' ? 'text-red-500' : 'text-amber-500'"
            />
            <div class="min-w-0">
              <span class="text-sm font-mono">{{ tag.tag }}</span>
              <p class="text-xs text-[var(--color-text-muted)]">
                {{ tag.message }}
              </p>
            </div>
          </div>
        </div>
      </DevtoolsSection>

      <!-- Essential tags checklist -->
      <DevtoolsSection icon="carbon:task" text="Essential Tags Checklist">
        <div class="space-y-5">
          <div v-for="(tags, category) of essentialTagsByCategory" :key="category">
            <div class="seo-category-header">
              <span>{{ category }}</span>
            </div>
            <div class="seo-checklist">
              <div v-for="tag of tags" :key="tag.name" class="seo-checklist__item">
                <UIcon
                  :name="tag.present ? 'carbon:checkmark-filled' : tag.fallback ? 'carbon:information-filled' : 'carbon:close-filled'"
                  class="text-sm shrink-0"
                  :class="tag.present ? 'text-green-500' : tag.fallback ? 'text-gray-400' : 'text-red-400'"
                />
                <span class="text-sm font-mono flex-1 min-w-0 truncate">{{ tag.name }}</span>
                <span v-if="tag.value" class="seo-checklist__value">
                  {{ tag.value }}
                </span>
                <UBadge v-else-if="tag.fallback" color="neutral" variant="subtle" size="xs">
                  falls back to {{ tag.fallback }}
                </UBadge>
                <UBadge v-else color="neutral" variant="subtle" size="xs">
                  missing
                </UBadge>
              </div>
            </div>
          </div>
        </div>
      </DevtoolsSection>

      <!-- All meta tags -->
      <DevtoolsSection icon="carbon:list" text="All Meta Tags">
        <template #actions>
          <DevtoolsMetric :value="result.allMeta.length" label="tags" />
          <UButton
            size="xs"
            variant="ghost"
            color="neutral"
            icon="carbon:copy"
            :label="copied ? 'Copied!' : 'Copy JSON'"
            @click="copy(JSON.stringify({ title: result.title, description: result.description, canonical: result.canonical, og: result.ogTags, twitter: result.twitterTags }, null, 2))"
          />
        </template>
        <div class="seo-meta-table">
          <div v-for="(meta, i) of result.allMeta" :key="meta.name + i" class="seo-meta-table__row">
            <UBadge :color="meta.type === 'property' ? 'primary' : meta.type === 'name' ? 'neutral' : 'warning'" variant="subtle" size="xs">
              {{ meta.type }}
            </UBadge>
            <span class="text-sm font-mono shrink-0 text-[var(--color-text)]">{{ meta.name }}</span>
            <span class="text-xs text-[var(--color-text-muted)] truncate min-w-0 flex-1 text-right font-mono">{{ meta.content }}</span>
          </div>
        </div>
      </DevtoolsSection>
    </template>

    <!-- Not connected -->
    <DevtoolsEmptyState
      v-else
      icon="carbon:plug"
      title="Waiting for connection"
      description="Waiting for connection to host app..."
    />
  </div>
</template>

<style scoped>
/* Status card with score ring */
.seo-status-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: border-color 200ms;
}

.seo-status-card--success { border-color: oklch(70% 0.15 145 / 0.4); }
.seo-status-card--warning { border-color: oklch(70% 0.15 80 / 0.4); }

/* Score ring */
.seo-score-ring {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.seo-score-ring__svg {
  width: 100%;
  height: 100%;
}

.seo-score-ring__progress {
  transition: stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.seo-score-ring__progress--success { stroke: oklch(65% 0.2 145); }
.seo-score-ring__progress--warning { stroke: oklch(70% 0.18 80); }

.seo-score-ring__text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.6875rem;
  font-weight: 700;
  font-family: var(--font-mono);
  letter-spacing: -0.02em;
}

.seo-score-ring__separator {
  opacity: 0.35;
  margin: 0 0.5px;
}

/* SERP preview */
.serp-preview-container {
  padding: 1.25rem;
  border-radius: var(--radius-md);
  background: white;
  border: 1px solid oklch(0% 0 0 / 0.08);
}

.dark .serp-preview-container {
  background: #202124;
  border-color: oklch(100% 0 0 / 0.06);
}

.serp-preview__favicon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(0% 0 0 / 0.04);
}

.dark .serp-preview__favicon {
  background: oklch(100% 0 0 / 0.06);
}

.serp-preview__title {
  font-size: 1.25rem;
  line-height: 1.3;
  color: #1a0dab;
  cursor: pointer;
  margin-bottom: 0.25rem;
}

.serp-preview__title:hover {
  text-decoration: underline;
}

.dark .serp-preview__title {
  color: #8ab4f8;
}

.serp-preview__description {
  font-size: 0.875rem;
  line-height: 1.58;
  color: #4d5156;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dark .serp-preview__description {
  color: #bdc1c6;
}

/* Length status labels */
.seo-length-status {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.seo-length-status--success {
  background: oklch(75% 0.15 145 / 0.12);
  color: oklch(50% 0.15 145);
}

.dark .seo-length-status--success {
  background: oklch(50% 0.15 145 / 0.15);
  color: oklch(75% 0.18 145);
}

.seo-length-status--warning {
  background: oklch(75% 0.12 80 / 0.12);
  color: oklch(55% 0.15 80);
}

.dark .seo-length-status--warning {
  background: oklch(55% 0.12 80 / 0.15);
  color: oklch(75% 0.15 80);
}

.seo-length-status--error {
  background: oklch(65% 0.15 25 / 0.1);
  color: oklch(55% 0.18 25);
}

.dark .seo-length-status--error {
  background: oklch(50% 0.12 25 / 0.15);
  color: oklch(72% 0.15 25);
}

/* Progress bar */
.seo-progress-track {
  position: relative;
  height: 6px;
  border-radius: 3px;
  background: var(--color-surface-sunken);
  overflow: visible;
}

.seo-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 400ms cubic-bezier(0.22, 1, 0.36, 1);
}

.seo-progress-fill--success { background: oklch(65% 0.2 145); box-shadow: 0 0 8px oklch(65% 0.2 145 / 0.3); }
.seo-progress-fill--warning { background: oklch(70% 0.18 80); box-shadow: 0 0 8px oklch(70% 0.18 80 / 0.3); }
.seo-progress-fill--error { background: oklch(62% 0.2 25); box-shadow: 0 0 8px oklch(62% 0.2 25 / 0.3); }

.seo-progress-marker {
  position: absolute;
  top: -2px;
  width: 1px;
  height: 10px;
  background: var(--color-text-subtle);
  opacity: 0.4;
  transform: translateX(-0.5px);
}

/* Issue rows */
.seo-issue-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-sm);
  transition: background 150ms;
}

.seo-issue-row:hover {
  background: var(--color-surface-sunken);
}

/* Category headers */
.seo-category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.seo-category-header span {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

/* Checklist */
.seo-checklist__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: background 150ms;
}

.seo-checklist__item:hover {
  background: var(--color-surface-sunken);
}

.seo-checklist__value {
  font-size: 0.6875rem;
  font-family: var(--font-mono);
  color: var(--color-text-subtle);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Meta tags table */
.seo-meta-table__row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-sm);
  transition: background 150ms;
}

.seo-meta-table__row:hover {
  background: var(--color-surface-sunken);
}

.seo-meta-table__row:nth-child(even) {
  background: oklch(0% 0 0 / 0.015);
}

.dark .seo-meta-table__row:nth-child(even) {
  background: oklch(100% 0 0 / 0.015);
}

.seo-meta-table__row:nth-child(even):hover {
  background: var(--color-surface-sunken);
}
</style>
