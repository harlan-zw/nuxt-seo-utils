---
name: nuxt-seo-utils
description: Set up, override, and debug the default SEO head tags in a Nuxt app with the nuxt-seo-utils module. Use when a task mentions canonical URLs, the title template or separator, fallback titles, og:image or twitter:image files, favicons and app icons, seo.meta, seoMeta or head in routeRules, useBreadcrumbItems, useShareLinks, the nuxt-seo-utils icons CLI, or the seo config key. Also use when a page tag does not override a default, html lang ignores useHead, or og:image renders twice.
license: MIT
compatibility: "Requires Node.js ^22.22.3 || ^24.15.0 || >=26.0.0. Requires Nuxt ^4.6.0 || ^5.0.0."
---

# nuxt-seo-utils

Requires Nuxt `^4.6.0 || ^5.0.0` and Unhead 3.4.2 or newer.
The module adds default head tags from site config, reads icon and social image files, and ships breadcrumb and share link composables.
Docs: https://nuxtseo.com/docs/seo-utils

## Setup

The config key is `seo`. `seoUtils` does nothing.
Set `site.url` and `site.name`. The canonical URL, `og:url`, the title template, and absolute image URLs read them.

```ts
export default defineNuxtConfig({
  modules: ['nuxt-seo-utils'],
  site: { url: 'https://example.com', name: 'Acme', description: 'Default description', twitter: 'acme', defaultLocale: 'en-US' },
})
```

Crawlers read only the SSR response. The defaults render on the server.

## Automatic behaviour

With the defaults, every page gets:

- `<title>` from the template `%s %separator %siteName`. The separator is `|`. Change it with `site.separator`.
- A fallback title from the last path segment, title cased: `/blog/my-post` becomes `My Post`. `definePageMeta({ title })` sets it with a static string.
- `<link rel="canonical">` from `site.url` and the route path, lowercased, with only these query keys kept: `page`, `sort`, `filter`, `search`, `q`, `category`, `tag`.
- `og:url` (the resolved canonical, including one a page sets), `og:type` (`website`), `og:site_name` (`site.name`), and `description` from `site.description`.
- `og:title`, `og:description`, and `twitter:card` (`summary_large_image`), inferred from the title and description.
- `twitter:site` and `twitter:creator` from `site.twitter`. The `@` is added.
- `<html lang>` from `site.currentLocale` or `site.defaultLocale`, else `en`.
- `og:locale` only when the locale has a region. `en-US` renders `en_US`. `en` renders no tag.
- Relative `og:image` and `twitter:image` values become absolute against `site.url`.

Module tags use `tagPriority: 'low'`, so a page `useSeoMeta()` or `useHead()` call replaces them.
A page `ogImage` also drops the default image's width, height, type, and copied `twitter:image`. A page `ogImageAlt` alone keeps the default image.
A page canonical needs no extra priority:

```ts
useHead({ link: [{ rel: 'canonical', href: 'https://example.com/preferred' }] })
```

Set `seo: { automaticDefaults: false }` to drop the canonical, title template, `lang`, and Open Graph defaults together. No option drops only one of them.

## Metadata files

Files in `public/` become site-wide head tags at build time:

- `favicon.{ico,png,svg}`, `icon*.{ico,png,jpg,svg}`, `apple-icon*.png`, `apple-touch-icon*.png`: `<link rel="icon">` or `apple-touch-icon`, with `type` and `sizes` read from the file.
- `og-image.{png,jpg,jpeg,gif}` or `opengraph-image.*`: `og:image` with width, height, and type. It also fills `twitter:image` when no `twitter-image.*` file exists. The name must match exactly; `blog-og-image.png` is ignored.
- `<name>.alt.txt` next to an image sets `og:image:alt`.
- `-dark` or `-light` in an icon name adds a `prefers-color-scheme` media query.

The same file names inside `pages/<route>/` or `pages/<route>/_dir/` apply to that route and its children. They replace a `public/` image there.
An icon link in `app.head.link` with the same `rel` wins over the files.
Set `seo: { metaDataFiles: false }` to turn this off.

Generate icon files from one source image in `public/`:

```bash
pnpm exec nuxt-seo-utils icons --source logo.svg
```

It writes `favicon.ico`, `apple-touch-icon.png`, and `icon-{16,32,192,512}` PNGs to `public/`. Install the optional peer with `pnpm add -D sharp` before generating icons.

## Site-wide and per-route meta

`seo.meta` takes `useSeoMeta()` input and renders on every page:

```ts
export default defineNuxtConfig({
  seo: { meta: { author: 'Acme Team', themeColor: '#18181b' } },
})
```

`routeRules` accept `seoMeta` and `head`:

```ts
export default defineNuxtConfig({
  routeRules: {
    '/blog/**': { seoMeta: { author: 'Blog Team' }, head: { meta: [{ name: 'x-section', content: 'blog' }] } },
  },
})
```

Route rule tags override `seo.meta` and `app.head`. A page `useSeoMeta()` or `useHead()` call overrides them. The `tagPriority` option does not change this.
Route rule tags render on the server only. They do not update on client navigation.

## Breadcrumbs

`useBreadcrumbItems()` is auto-imported. It returns a ref of items from the route path, ready for Nuxt UI `<UBreadcrumb :items>`.

```ts
const items = useBreadcrumbItems({
  overrides: [undefined, undefined, { label: post.value.title }], // index matches the path segment; false removes it
})
```

- With `nuxt-schema-org` installed, it also adds a `BreadcrumbList` node. Without it, no JSON-LD renders and there is no warning.
- Labels come from `definePageMeta({ breadcrumb: { label } })`, then `title` in page meta, then the title-cased segment. The index route is `Home`.
- Call it in the page component, not the layout. The page has the data for the last items. Calls in parent components with the same `id` merge their options.

## Share links

```ts
const share = useShareLinks({ title: post.value.title, utm: { source: 'auto', campaign: 'launch' } })
// share.value.twitter, .facebook, .linkedin, .whatsapp, .telegram, .reddit, .pinterest, .email, .canonicalUrl
```

`title` defaults to `site.name`, not the page title. Pass it.
UTM defaults to `utm_source=<platform>` and `utm_medium=social` (or `email`). An object without `source: 'auto'` switches to manual mode: `{ campaign: 'launch' }` sends only `utm_campaign`.

## Traps

- **`htmlAttrs.lang` in `useHead()` or `app.head` is ignored.** The module sets `lang` from site config. Set `site.defaultLocale`, or use `@nuxtjs/i18n`.
- **Before nuxt-schema-org 6.4.1, the Schema.org WebPage URL keeps the route case.** `canonicalLowercase` lowercases the canonical, `og:url`, `useShareLinks()` URLs, and `BreadcrumbList` item URLs. nuxt-schema-org before 6.4.1 builds the WebPage `url` from the route path. There, `/blog/My-Post` gets a canonical of `/blog/my-post` and a WebPage URL of `/blog/My-Post`. From 6.4.1, the WebPage `url` follows the canonical. On an older version, upgrade nuxt-schema-org, use lowercase route paths, or set `canonicalLowercase: false`. Breadcrumb `to` links keep their case on purpose.
- **`definePageMeta({ title })` takes a static string only.** Use `useSeoMeta({ title })` for data.

## Version limits

- 8.5.2 and earlier: a page `ogImage` keeps the default image's dimensions and `twitter:image`, a page canonical leaves `og:url` on the route URL, a `pages/<route>/og-image.png` renders `og:image:alt` twice, and `public/opengraph-image.*` is ignored.
- 8.5.2 and earlier: `BreadcrumbList` item URLs keep the route case, and `useShareLinks()` lowercases without the site locale.
- 8.5.2 and earlier: `seo.meta` and `public/og-image.png` beat route rule `seoMeta` and `pages/**/og-image.png`. Put the route value in the page with `useSeoMeta()`.
- `treeShakeUseSeoMeta` needs Unhead v3. On Unhead v2 the module skips it with a warning.
- `automaticTwitterTags: false` (removes `twitter:card`) arrived in 8.5.0.

## Config

- `redirectToCanonicalSiteUrl` (`false`): in production, send a 301 from other hosts to the `site.url` host.
- `canonicalQueryWhitelist`: replaces the default list. It does not extend it.
- `minify` (`{ build: true, runtime: false }`): minify static `app.head` JavaScript/CSS with parser-based tooling. Compact JSON/CSS in prerendered HTML. `runtime: true` compacts JSON/CSS per SSR request. Dynamic JavaScript and custom script types remain unchanged.
- `automaticOgAndTwitterTags` (`true`): the `og:title`, `og:description`, and `twitter:card` inference.
- Other options: https://nuxtseo.com/docs/seo-utils/api/config

## Debug

- On `nuxt dev` and `nuxt build`, the module warns about conflicts in `app.head`, such as a static `lang` or an `og:site_name` that differs from `site.name`. Fix the site config, not the head. Set `validateAppHead: false` to hide the check.
- `/__nuxt-seo-utils/debug.json` in dev, or in production with `seo: { debug: true }`.
- Nuxt DevTools has an SEO Utils tab.
