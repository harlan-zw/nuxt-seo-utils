<script setup lang="ts">
import { useClipboard } from '@vueuse/core'
import { computed, ref, watch } from 'vue'
import { data } from '../composables/state'
import { parseMetaTags } from '../composables/tools'

const { copy, copied } = useClipboard()

const loading = ref(false)
const error = ref<string | null>(null)

interface IconLink {
  rel: string
  href: string
  type?: string
  sizes?: string
  media?: string
}

interface ParsedIdentity {
  icons: IconLink[]
  ogImages: Array<{ url: string, width?: string, height?: string, alt?: string }>
  twitterImages: Array<{ url: string, width?: string, height?: string }>
  themeColors: Array<{ color: string, media?: string, context: 'light' | 'dark' | 'default' }>
  colorScheme: string | null
}

const parsedPage = ref<ParsedIdentity | null>(null)

const siteConfig = computed(() => data.value?.siteConfig || null)
const pageIcons = computed(() => parsedPage.value?.icons || [])
const hasIcons = computed(() => pageIcons.value.length > 0)

const iconsByRel = computed(() => {
  const groups: Record<string, IconLink[]> = {}
  pageIcons.value.forEach((link) => {
    const rel = link.rel || 'icon'
    if (!groups[rel])
      groups[rel] = []
    groups[rel].push(link)
  })
  return groups
})

const iconRelLabels: Record<string, { label: string, description: string }> = {
  'icon': {
    label: 'Favicon',
    description: 'Browser tab icons used across the site',
  },
  'apple-touch-icon': {
    label: 'Apple Touch Icon',
    description: 'High resolution icon for iOS home screen',
  },
}

// Identity completeness score
const identityScore = computed(() => {
  if (!siteConfig.value || !parsedPage.value)
    return { present: 0, total: 0 }
  const checks = [
    !!siteConfig.value.name,
    !!siteConfig.value.url && siteConfig.value.url !== 'http://localhost:3000',
    !!siteConfig.value.description,
    hasIcons.value,
    parsedPage.value.ogImages.length > 0,
    parsedPage.value.themeColors.length > 0,
  ]
  return { present: checks.filter(Boolean).length, total: checks.length }
})

const scorePercent = computed(() => {
  const { present, total } = identityScore.value
  return total > 0 ? Math.round((present / total) * 100) : 0
})

const scoreVariant = computed(() => {
  const p = scorePercent.value
  if (p >= 80)
    return 'success'
  if (p >= 50)
    return 'warning'
  return 'warning'
})

// Favicon URL for browser tab preview
const faviconUrl = computed(() => {
  const ico = pageIcons.value.find(l => l.href?.includes('favicon.ico'))
  if (ico)
    return ico.href
  const smallest = pageIcons.value.find(l => l.rel === 'icon')
  return smallest?.href || null
})

const displayUrl = computed(() => {
  if (!siteConfig.value?.url)
    return 'localhost:3000'
  try {
    const url = new URL(siteConfig.value.url)
    return url.hostname
  }
  catch {
    return siteConfig.value.url
  }
})

async function checkIdentity() {
  loading.value = true
  error.value = null
  parsedPage.value = null

  try {
    const baseUrl = window.parent?.location?.origin || window.location.origin
    const response = await fetch(`${baseUrl}${path.value}`, {
      headers: { Accept: 'text/html' },
    })
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`)
    const html = await response.text()
    const parsed = parseMetaTags(html)

    const themeColors: ParsedIdentity['themeColors'] = []
    parsed.allMeta
      .filter(m => m.name === 'theme-color')
      .forEach((m) => {
        let context: 'light' | 'dark' | 'default' = 'default'
        const media = m.media || null
        if (media?.includes('prefers-color-scheme: light'))
          context = 'light'
        else if (media?.includes('prefers-color-scheme: dark'))
          context = 'dark'
        themeColors.push({ color: m.content, media: media || undefined, context })
      })

    const ogImages: ParsedIdentity['ogImages'] = []
    if (parsed.ogTags['og:image']) {
      ogImages.push({
        url: parsed.ogTags['og:image'],
        width: parsed.ogTags['og:image:width'],
        height: parsed.ogTags['og:image:height'],
        alt: parsed.ogTags['og:image:alt'],
      })
    }

    const twitterImages: ParsedIdentity['twitterImages'] = []
    if (parsed.twitterTags['twitter:image']) {
      twitterImages.push({
        url: parsed.twitterTags['twitter:image'],
        width: parsed.twitterTags['twitter:image:width'],
        height: parsed.twitterTags['twitter:image:height'],
      })
    }

    const colorSchemeTag = parsed.allMeta.find(m => m.name === 'color-scheme')

    // Resolve relative icon URLs to absolute
    const icons = parsed.iconLinks.map(icon => ({
      ...icon,
      href: icon.href.startsWith('http') ? icon.href : `${baseUrl}${icon.href.startsWith('/') ? '' : '/'}${icon.href}`,
    }))

    parsedPage.value = {
      icons,
      ogImages,
      twitterImages,
      themeColors,
      colorScheme: colorSchemeTag?.content || null,
    }
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
    checkIdentity()
}, { immediate: true })

const cliCommand = 'npx nuxt-seo-utils icons --source <your-logo.svg>'

const iconSizesGenerated = [
  { name: 'favicon.ico', size: '32x32', desc: 'Browser tab' },
  { name: 'icon-16x16.png', size: '16x16', desc: 'Small favicon' },
  { name: 'icon-32x32.png', size: '32x32', desc: 'Standard favicon' },
  { name: 'apple-touch-icon.png', size: '180x180', desc: 'iOS home screen' },
  { name: 'icon-192x192.png', size: '192x192', desc: 'Android/PWA' },
  { name: 'icon-512x512.png', size: '512x512', desc: 'PWA splash' },
]
</script>

<template>
  <div class="space-y-5 stagger-children">
    <!-- Loading -->
    <DevtoolsLoading v-if="loading" />

    <!-- Error -->
    <DevtoolsError v-else-if="error" :error="error" title="Failed to check page">
      <UButton size="sm" variant="ghost" icon="carbon:reset" label="Retry" @click="checkIdentity" />
    </DevtoolsError>

    <!-- Results -->
    <template v-else-if="parsedPage">
      <!-- Hero: Identity Summary with browser tab preview -->
      <div class="id-hero" :class="`id-hero--${scoreVariant}`">
        <div class="id-hero__left">
          <!-- Score ring -->
          <div class="id-score-ring">
            <svg viewBox="0 0 36 36" class="id-score-ring__svg">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-border-subtle)" stroke-width="2.5" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                class="id-score-ring__progress"
                :class="`id-score-ring__progress--${scoreVariant}`"
                stroke-width="2.5"
                stroke-linecap="round"
                :stroke-dasharray="`${scorePercent * 0.974}, 100`"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span class="id-score-ring__text">{{ identityScore.present }}<span class="id-score-ring__sep">/</span>{{ identityScore.total }}</span>
          </div>
          <div>
            <p class="font-medium text-sm">
              {{ scorePercent >= 80 ? 'Identity configured' : scorePercent >= 50 ? 'Partially configured' : 'Needs setup' }}
            </p>
            <p class="text-xs text-[var(--color-text-muted)]">
              {{ identityScore.present }} of {{ identityScore.total }} identity checks passing
            </p>
          </div>
        </div>

        <!-- Mini browser tab preview -->
        <div class="id-browser-tab">
          <div class="id-browser-tab__chrome">
            <div class="id-browser-tab__dots">
              <span /><span /><span />
            </div>
            <div class="id-browser-tab__tab">
              <img v-if="faviconUrl" :src="faviconUrl" class="id-browser-tab__favicon" alt="">
              <UIcon v-else name="carbon:earth" class="id-browser-tab__favicon-placeholder" />
              <span class="id-browser-tab__title">{{ siteConfig?.name || 'Untitled' }}</span>
            </div>
          </div>
          <div class="id-browser-tab__bar">
            <UIcon name="carbon:locked" class="id-browser-tab__lock" />
            <span class="id-browser-tab__url">{{ displayUrl }}</span>
          </div>
        </div>
      </div>

      <!-- Icons -->
      <DevtoolsSection icon="carbon:image" text="Icons">
        <template #actions>
          <DevtoolsMetric :value="pageIcons.length" label="icons" />
        </template>

        <template v-if="hasIcons">
          <div v-for="(icons, rel) in iconsByRel" :key="rel" class="mb-5 last:mb-0">
            <div class="id-group-header">
              <span>{{ iconRelLabels[rel]?.label || rel }}</span>
              <span class="id-group-count">{{ icons.length }}</span>
            </div>
            <p class="text-xs text-[var(--color-text-muted)] mb-3">
              {{ iconRelLabels[rel]?.description || '' }}
            </p>
            <div class="id-icon-grid">
              <div v-for="icon in icons" :key="icon.href" class="id-icon-card">
                <div class="id-icon-preview">
                  <img
                    :src="icon.href"
                    :alt="icon.rel"
                    class="id-icon-img"
                  >
                </div>
                <div class="id-icon-meta">
                  <a :href="icon.href" target="_blank" class="id-icon-href">
                    {{ icon.href }}
                  </a>
                  <div class="id-icon-badges">
                    <span v-if="icon.sizes" class="id-badge">{{ icon.sizes }}</span>
                    <span v-if="icon.type" class="id-badge">{{ icon.type }}</span>
                    <span v-if="icon.media" class="id-badge id-badge--accent">
                      {{ icon.media.includes('dark') ? 'Dark' : icon.media.includes('light') ? 'Light' : icon.media }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- No icons: generation CTA -->
        <div v-else class="id-empty panel-grids">
          <div class="id-empty__inner">
            <div class="id-empty__icon-ring">
              <UIcon name="carbon:image" class="text-xl" />
            </div>
            <p class="font-medium text-sm mb-0.5">
              No favicons detected
            </p>
            <p class="text-xs text-[var(--color-text-muted)] mb-5 max-w-xs text-center">
              Generate all required icon variants from a single source image.
            </p>

            <!-- Terminal card -->
            <div class="id-terminal">
              <div class="id-terminal__chrome">
                <span class="id-terminal__dot id-terminal__dot--red" />
                <span class="id-terminal__dot id-terminal__dot--yellow" />
                <span class="id-terminal__dot id-terminal__dot--green" />
                <span class="id-terminal__label">Terminal</span>
              </div>
              <div class="id-terminal__body">
                <span class="id-terminal__prompt">$</span>
                <code>{{ cliCommand }}</code>
                <UButton
                  size="xs"
                  variant="ghost"
                  color="neutral"
                  icon="carbon:copy"
                  class="id-terminal__copy"
                  @click="copy(cliCommand)"
                />
              </div>
            </div>

            <div class="id-gen-files">
              <div v-for="icon in iconSizesGenerated" :key="icon.name" class="id-gen-row">
                <UIcon name="carbon:arrow-right" class="id-gen-arrow" />
                <span class="id-gen-name">{{ icon.name }}</span>
                <span class="id-gen-size">{{ icon.size }}</span>
                <span class="id-gen-desc">{{ icon.desc }}</span>
              </div>
            </div>

            <div class="hint-callout mt-4 w-full">
              <UIcon name="carbon:information" class="hint-callout-icon text-sm mt-0.5 shrink-0" />
              <div class="text-xs text-[var(--color-text-muted)]">
                Place a source image (SVG, PNG, or JPG) in your <code class="id-code">public/</code> directory, then run the command above. Requires <code class="id-code">sharp</code> as a dev dependency:
                <pre class="id-snippet !mt-2 !mb-0">pnpm add -D sharp</pre>
              </div>
            </div>
          </div>
        </div>
      </DevtoolsSection>

      <!-- Theme Colors -->
      <DevtoolsSection icon="carbon:color-palette" text="Theme Colors">
        <template #actions>
          <DevtoolsMetric :value="parsedPage.themeColors.length" label="colors" />
        </template>

        <template v-if="parsedPage.themeColors.length || parsedPage.colorScheme">
          <!-- Color Scheme -->
          <div v-if="parsedPage.colorScheme" class="mb-5">
            <div class="id-group-header">
              <span>Color Scheme</span>
            </div>
            <div class="id-color-scheme-row">
              <div class="id-color-scheme-swatch" />
              <div>
                <span class="text-sm font-mono font-medium">{{ parsedPage.colorScheme }}</span>
                <p class="text-xs text-[var(--color-text-muted)]">
                  Supported color schemes for system preferences
                </p>
              </div>
            </div>
          </div>

          <!-- Theme Color Swatches -->
          <div v-if="parsedPage.themeColors.length">
            <div class="id-group-header">
              <span>Theme Colors</span>
            </div>
            <div class="id-color-grid">
              <div v-for="(tc, i) of parsedPage.themeColors" :key="i" class="id-color-card">
                <div
                  class="id-color-card__swatch"
                  :style="{ backgroundColor: tc.color }"
                />
                <div class="id-color-card__meta">
                  <span class="id-color-card__value">{{ tc.color }}</span>
                  <span v-if="tc.context !== 'default'" class="id-badge" :class="tc.context === 'dark' ? 'id-badge--dark' : 'id-badge--light'">
                    {{ tc.context }}
                  </span>
                  <span v-if="tc.media" class="text-[0.625rem] text-[var(--color-text-subtle)] block mt-0.5 font-mono">{{ tc.media }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="hint-callout">
          <UIcon name="carbon:information" class="hint-callout-icon text-sm mt-0.5 shrink-0" />
          <div class="text-xs text-[var(--color-text-muted)]">
            No theme colors found. Add theme color meta tags in your <code class="id-code">nuxt.config.ts</code>:
            <pre class="id-snippet !mt-2">app: {
  head: {
    meta: [
      { name: 'theme-color', content: '#00dc82' },
      { name: 'theme-color', content: '#18181b',
        media: '(prefers-color-scheme: dark)' }
    ]
  }
}</pre>
          </div>
        </div>
      </DevtoolsSection>

      <!-- Configuration Reference -->
      <DevtoolsSection icon="carbon:book" text="Configuration">
        <div class="id-guide-grid">
          <div class="id-guide-card">
            <div class="id-guide-card__icon">
              <UIcon name="carbon:settings" />
            </div>
            <h4 class="id-guide-card__title">
              Site Config
            </h4>
            <p class="id-guide-card__desc">
              Core identity settings
            </p>
            <pre class="id-snippet !mt-auto">site: {
  url: 'https://example.com',
  name: 'My Site',
  description: 'A description',
  defaultLocale: 'en',
}</pre>
          </div>

          <div class="id-guide-card">
            <div class="id-guide-card__icon">
              <UIcon name="carbon:folder" />
            </div>
            <h4 class="id-guide-card__title">
              Metadata Files
            </h4>
            <p class="id-guide-card__desc">
              Auto-detected from <code class="id-code">public/</code>
            </p>
            <div class="id-file-list">
              <div
                v-for="f in [
                  { name: 'favicon.ico', desc: 'Tab icon' },
                  { name: 'icon-*.png', desc: 'PNG variants' },
                  { name: 'apple-touch-icon.png', desc: 'iOS icon' },
                  { name: 'og-image.png', desc: 'Social share' },
                  { name: 'twitter-image.png', desc: 'Twitter card' },
                ]" :key="f.name" class="id-file-row"
              >
                <UIcon name="carbon:document" class="id-file-icon" />
                <span class="id-file-name">{{ f.name }}</span>
                <span class="id-file-desc">{{ f.desc }}</span>
              </div>
            </div>
          </div>

          <div class="id-guide-card">
            <div class="id-guide-card__icon">
              <UIcon name="carbon:terminal" />
            </div>
            <h4 class="id-guide-card__title">
              Icon Generation
            </h4>
            <p class="id-guide-card__desc">
              All variants from one source
            </p>
            <div class="id-terminal__body !mt-auto !rounded-[var(--radius-sm)]">
              <span class="id-terminal__prompt">$</span>
              <code class="text-xs">npx nuxt-seo-utils icons --source logo.svg</code>
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="carbon:copy"
                class="id-terminal__copy"
                @click="copy('npx nuxt-seo-utils icons --source logo.svg')"
              />
            </div>
            <p class="text-[0.6875rem] text-[var(--color-text-muted)] mt-2">
              Requires <code class="id-code">sharp</code> dev dependency. Accepts SVG, PNG, JPG, or WebP.
            </p>
          </div>
        </div>
      </DevtoolsSection>
    </template>

    <!-- Not connected -->
    <DevtoolsEmptyState
      v-else-if="!loading && !error"
      icon="carbon:identification"
      title="Waiting for connection"
      description="Waiting for connection to host app..."
    />
  </div>
</template>

<style scoped>
/* ═══════════════════════════════════════
   Hero Identity Card
   ═══════════════════════════════════════ */
.id-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-lg);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: border-color 200ms;
}

.id-hero--success { border-color: oklch(70% 0.15 145 / 0.4); }
.id-hero--warning { border-color: oklch(70% 0.15 80 / 0.4); }

.id-hero__left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* Score Ring (matching index.vue pattern) */
.id-score-ring {
  position: relative;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
}

.id-score-ring__svg { width: 100%; height: 100%; }

.id-score-ring__progress {
  transition: stroke-dasharray 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.id-score-ring__progress--success { stroke: oklch(65% 0.2 145); }
.id-score-ring__progress--warning { stroke: oklch(70% 0.18 80); }

.id-score-ring__text {
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

.id-score-ring__sep { opacity: 0.35; margin: 0 0.5px; }

/* Mini browser tab mockup */
.id-browser-tab {
  flex-shrink: 0;
  width: 220px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-sunken);
  font-size: 0;
}

.id-browser-tab__chrome {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
}

.id-browser-tab__dots {
  display: flex;
  gap: 4px;
}

.id-browser-tab__dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-border);
}

.id-browser-tab__tab {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-surface-sunken);
  border-radius: 4px 4px 0 0;
  max-width: 140px;
}

.id-browser-tab__favicon {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  object-fit: contain;
}

.id-browser-tab__favicon-placeholder {
  width: 12px;
  height: 12px;
  color: var(--color-text-subtle);
}

.id-browser-tab__title {
  font-size: 0.5625rem;
  font-weight: 500;
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-browser-tab__bar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
}

.id-browser-tab__lock {
  width: 10px;
  height: 10px;
  color: var(--color-text-subtle);
}

.id-browser-tab__url {
  font-size: 0.5625rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .id-hero { flex-direction: column; align-items: flex-start; }
  .id-browser-tab { width: 100%; }
}

/* ═══════════════════════════════════════
   Key-Value List
   ═══════════════════════════════════════ */
.id-kv-list {
  display: flex;
  flex-direction: column;
}

.id-kv-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.625rem;
  border-radius: var(--radius-sm);
  transition: background 150ms;
}

.id-kv-row:hover { background: var(--color-surface-sunken); }

.id-kv-row:nth-child(even) { background: oklch(0% 0 0 / 0.015); }
.dark .id-kv-row:nth-child(even) { background: oklch(100% 0 0 / 0.015); }
.id-kv-row:nth-child(even):hover { background: var(--color-surface-sunken); }

.id-kv-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.id-kv-value {
  font-size: 0.8125rem;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.id-link {
  color: var(--seo-green);
  text-decoration: none;
  transition: text-decoration-color 150ms;
}

.id-link:hover { text-decoration: underline; text-underline-offset: 2px; }

/* ═══════════════════════════════════════
   Inline Code & Snippets
   ═══════════════════════════════════════ */
.id-code {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text);
  border: 1px solid var(--color-border-subtle);
}

.id-snippet {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.65;
  padding: 0.625rem 0.75rem;
  margin-top: 0.5rem;
  border-radius: var(--radius-sm);
  background: var(--color-surface-sunken);
  color: var(--color-text);
  border: 1px solid var(--color-border-subtle);
  overflow-x: auto;
  white-space: pre;
}

/* ═══════════════════════════════════════
   Group Headers
   ═══════════════════════════════════════ */
.id-group-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.id-group-header span {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}

.id-group-count {
  font-family: var(--font-mono) !important;
  font-size: 0.625rem !important;
  padding: 0 0.3rem;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text-subtle) !important;
}

/* ═══════════════════════════════════════
   Badges
   ═══════════════════════════════════════ */
.id-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.05rem 0.4rem;
  font-size: 0.625rem;
  font-family: var(--font-mono);
  font-weight: 500;
  border-radius: 4px;
  background: var(--color-surface-sunken);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-subtle);
}

.id-badge--accent {
  background: oklch(65% 0.2 145 / 0.1);
  color: oklch(55% 0.15 145);
  border-color: oklch(65% 0.2 145 / 0.2);
}

.dark .id-badge--accent {
  background: oklch(45% 0.12 145 / 0.15);
  color: oklch(75% 0.15 145);
  border-color: oklch(55% 0.12 145 / 0.2);
}

.id-badge--dark {
  background: oklch(20% 0.01 260 / 0.8);
  color: oklch(80% 0.01 260);
  border-color: oklch(30% 0.01 260);
}

.id-badge--light {
  background: oklch(95% 0.01 80 / 0.8);
  color: oklch(45% 0.05 80);
  border-color: oklch(85% 0.02 80);
}

/* ═══════════════════════════════════════
   Icon Grid
   ═══════════════════════════════════════ */
.id-icon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.625rem;
}

.id-icon-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: border-color 200ms, box-shadow 200ms;
}

.id-icon-card:hover {
  border-color: var(--color-neutral-300);
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.05);
}

.dark .id-icon-card:hover {
  border-color: var(--color-neutral-700);
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.25);
}

.id-icon-preview {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  /* Checkerboard for transparency */
  background-image:
    linear-gradient(45deg, var(--color-surface-sunken) 25%, transparent 25%),
    linear-gradient(-45deg, var(--color-surface-sunken) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, var(--color-surface-sunken) 75%),
    linear-gradient(-45deg, transparent 75%, var(--color-surface-sunken) 75%);
  background-size: 8px 8px;
  background-position: 0 0, 0 4px, 4px -4px, -4px 0;
  background-color: var(--color-surface-elevated);
}

.id-icon-img {
  max-width: 36px;
  max-height: 36px;
  object-fit: contain;
  image-rendering: auto;
}

.id-icon-meta {
  flex: 1;
  min-width: 0;
}

.id-icon-href {
  display: block;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  color: var(--seo-green);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
  margin-bottom: 0.25rem;
}

.id-icon-href:hover { text-decoration: underline; text-underline-offset: 2px; }

.id-icon-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

/* ═══════════════════════════════════════
   Empty State (Icons)
   ═══════════════════════════════════════ */
.id-empty {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.id-empty__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1.5rem;
}

.id-empty__icon-ring {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-surface-elevated);
  border: 2px solid var(--color-border);
  color: var(--color-text-subtle);
  margin-bottom: 1rem;
}

/* ═══════════════════════════════════════
   Terminal Card
   ═══════════════════════════════════════ */
.id-terminal {
  width: 100%;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
  background: var(--color-surface-elevated);
}

.id-terminal__chrome {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.5rem 0.75rem;
  background: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
}

.id-terminal__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.id-terminal__dot--red { background: oklch(65% 0.2 25); }
.id-terminal__dot--yellow { background: oklch(80% 0.15 85); }
.id-terminal__dot--green { background: oklch(70% 0.18 145); }

.id-terminal__label {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-text-subtle);
  margin-left: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.id-terminal__body {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface-sunken);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.id-terminal__prompt {
  color: var(--seo-green);
  font-weight: 700;
  user-select: none;
}

.id-terminal__copy {
  margin-left: auto;
  flex-shrink: 0;
}

/* Generated files list */
.id-gen-files {
  width: 100%;
  margin-top: 1rem;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.id-gen-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.6875rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.id-gen-row:last-child { border-bottom: none; }

.id-gen-row:nth-child(even) { background: oklch(0% 0 0 / 0.012); }
.dark .id-gen-row:nth-child(even) { background: oklch(100% 0 0 / 0.012); }

.id-gen-arrow {
  width: 10px;
  height: 10px;
  color: var(--seo-green);
  flex-shrink: 0;
}

.id-gen-name {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-text);
}

.id-gen-size {
  font-family: var(--font-mono);
  color: var(--color-text-subtle);
  margin-left: auto;
}

.id-gen-desc {
  color: var(--color-text-muted);
  width: 7rem;
  text-align: right;
}

/* ═══════════════════════════════════════
   Social Images
   ═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   Theme Colors
   ═══════════════════════════════════════ */
.id-color-scheme-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.id-color-scheme-swatch {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: linear-gradient(135deg, white 50%, #18181b 50%);
  flex-shrink: 0;
}

.id-color-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
  margin-top: 0.625rem;
}

.id-color-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  min-width: 200px;
  flex: 1;
  transition: border-color 200ms;
}

.id-color-card:hover { border-color: var(--color-neutral-300); }
.dark .id-color-card:hover { border-color: var(--color-neutral-700); }

.id-color-card__swatch {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: var(--radius-sm);
  border: 1px solid oklch(0% 0 0 / 0.1);
  flex-shrink: 0;
  box-shadow: 0 1px 4px oklch(0% 0 0 / 0.08), inset 0 1px 0 oklch(100% 0 0 / 0.15);
}

.id-color-card__meta {
  min-width: 0;
}

.id-color-card__value {
  font-size: 0.8125rem;
  font-family: var(--font-mono);
  font-weight: 500;
  display: block;
}

/* ═══════════════════════════════════════
   Configuration Guide
   ═══════════════════════════════════════ */
.id-guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.75rem;
}

.id-guide-card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: var(--radius-md);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  transition: border-color 200ms, box-shadow 200ms;
}

.id-guide-card:hover {
  border-color: var(--color-neutral-300);
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.04);
}

.dark .id-guide-card:hover {
  border-color: var(--color-neutral-700);
  box-shadow: 0 2px 12px oklch(0% 0 0 / 0.2);
}

.id-guide-card__icon {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  background: oklch(65% 0.2 145 / 0.1);
  color: var(--seo-green);
  margin-bottom: 0.625rem;
  font-size: 0.875rem;
}

.id-guide-card__title {
  font-size: 0.8125rem;
  font-weight: 600;
  margin-bottom: 0.125rem;
}

.id-guide-card__desc {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-bottom: 0.75rem;
}

.id-file-list {
  display: flex;
  flex-direction: column;
  margin-top: auto;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.id-file-row {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.625rem;
  border-bottom: 1px solid var(--color-border-subtle);
}

.id-file-row:last-child { border-bottom: none; }
.id-file-row:nth-child(even) { background: oklch(0% 0 0 / 0.012); }
.dark .id-file-row:nth-child(even) { background: oklch(100% 0 0 / 0.012); }

.id-file-icon {
  width: 10px;
  height: 10px;
  color: var(--color-text-subtle);
  flex-shrink: 0;
}

.id-file-name {
  font-family: var(--font-mono);
  font-weight: 500;
  color: var(--color-text);
}

.id-file-desc {
  color: var(--color-text-muted);
  margin-left: auto;
}
</style>
