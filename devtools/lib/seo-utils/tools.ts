export const SEO_LIMITS = {
  TITLE_MAX_CHARS: 60,
  TITLE_WARN_CHARS: 50,
  TITLE_MAX_PIXELS: 580,
  DESC_MAX_CHARS: 160,
  DESC_WARN_CHARS: 150,
  DESC_MAX_PIXELS: 920,
} as const

export interface ParsedIconLink {
  rel: string
  href: string
  type?: string
  sizes?: string
  media?: string
}

export function estimatePixelWidth(text: string, fontSize: number = 16): number {
  return Math.round(text.length * fontSize * 0.55)
}

export function resolveAppUrl(origin: string, appBaseURL: string, path: string): string {
  const base = new URL(appBaseURL, origin)
  if (!base.pathname.endsWith('/'))
    base.pathname += '/'

  const candidate = new URL(path, origin)
  const basePath = base.pathname.replace(/\/$/, '')
  if (candidate.pathname === basePath || candidate.pathname.startsWith(`${basePath}/`))
    return candidate.href
  return new URL(path.replace(/^\//, ''), base).href
}

export function getIconIssues(icons: ParsedIconLink[]): string[] {
  return icons.flatMap((icon) => {
    const isSvg = icon.type === 'image/svg+xml' || /\.svg(?:[?#]|$)/i.test(icon.href)
    if (!icon.sizes)
      return [`${icon.href} has no sizes attribute.`]
    if (icon.sizes.toLowerCase().split(/\s+/).includes('any') && !isSvg)
      return [`${icon.href} uses sizes="any", which is reserved for scalable icons.`]
    return []
  })
}

export function parseMetaTags(html: string) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  const title = doc.querySelector('title')?.textContent?.trim() || ''
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || ''
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href') || ''

  const ogTags: Record<string, string> = {}
  doc.querySelectorAll('meta[property^="og:"]').forEach((el) => {
    const prop = el.getAttribute('property')
    const content = el.getAttribute('content')
    if (prop && content)
      ogTags[prop] = content
  })

  const twitterTags: Record<string, string> = {}
  doc.querySelectorAll('meta[name^="twitter:"]').forEach((el) => {
    const name = el.getAttribute('name')
    const content = el.getAttribute('content')
    if (name && content)
      twitterTags[name] = content
  })

  const allMeta: { name: string, content: string, type: 'name' | 'property' | 'http-equiv', media?: string }[] = []
  doc.querySelectorAll('meta').forEach((el) => {
    const name = el.getAttribute('name')
    const property = el.getAttribute('property')
    const httpEquiv = el.getAttribute('http-equiv')
    const content = el.getAttribute('content') || ''
    const media = el.getAttribute('media') || undefined

    if (name)
      allMeta.push({ name, content, type: 'name', media })
    else if (property)
      allMeta.push({ name: property, content, type: 'property', media })
    else if (httpEquiv)
      allMeta.push({ name: httpEquiv, content, type: 'http-equiv', media })
  })

  const schemas: Array<{ type: string, data: any, raw: string }> = []
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((el) => {
    const raw = el.textContent?.trim() || ''
    try {
      const data = JSON.parse(raw)
      const type = data['@type'] || (data['@graph'] ? 'Graph' : 'Unknown')
      schemas.push({ type, data, raw })
    }
    catch {
      schemas.push({ type: 'Invalid JSON', data: null, raw })
    }
  })

  const iconLinks: ParsedIconLink[] = []
  doc.querySelectorAll('link[rel][href]').forEach((el) => {
    const relTokens = (el.getAttribute('rel') || '').toLowerCase().split(/\s+/)
    const rel = relTokens.includes('apple-touch-icon')
      ? 'apple-touch-icon'
      : relTokens.includes('icon')
        ? 'icon'
        : null
    if (!rel)
      return
    const href = el.getAttribute('href')
    if (!href)
      return
    iconLinks.push({
      rel,
      href,
      type: el.getAttribute('type') || undefined,
      sizes: el.getAttribute('sizes') || undefined,
      media: el.getAttribute('media') || undefined,
    })
  })

  return { title, description, ogTags, twitterTags, allMeta, canonical, schemas, iconLinks }
}

export function titleColor(length: number) {
  if (length > SEO_LIMITS.TITLE_MAX_CHARS)
    return 'error'
  if (length < 30)
    return 'warning'
  return 'success'
}

export function descColor(length: number) {
  if (length > SEO_LIMITS.DESC_MAX_CHARS)
    return 'error'
  if (length > SEO_LIMITS.DESC_WARN_CHARS || length < 70)
    return 'warning'
  return 'success'
}
