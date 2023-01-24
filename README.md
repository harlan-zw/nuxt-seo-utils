<h1 align='center'>△ nuxt-unhead</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-unhead/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-unhead" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-unhead?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-unhead" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-unhead?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-unhead" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-unhead?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Experimental features for Nuxt v3 head management. Powered by <a href="https://github.com/unjs/unhead">Unhead</a>.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> Stable</b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

ℹ️ Looking for a complete SEO solution? Check out [Nuxt SEO Kit](https://github.com/harlan-zw/nuxt-seo-kit).

## Features

Unlock all [Unhead](https://unhead.harlanzw.com/) features and more:
- 🖥️ 0kb runtime tags `useServerHead`
- 🧙 Define your meta tags as a flat object `useSeoMeta`
- ✨ Automatic social share meta tags
- 🤖 Debug head tags component `DebugHead`
- 🌳 Fully typed Head Schema with `href` and `src` file auto-completion
- 🪝 Runtime hooks: `head:tags`, `head:entries`
- 📦 Load your asset files directly using aliases `href: '~/assets/style.css'`

## Background

I'm the maintainer of [@vueuse/head](https://github.com/vueuse/head) and [zhead](https://github.com/harlan-zw/zhead).

This module was built to test bug fixes as well as experimental new features which may
land into the Nuxt core.

While it should be relatively safe for production use, it will be updated frequently and may lose parity with the Nuxt meta module, use with caution.

## Install

```bash
npm install --save-dev nuxt-unhead

# Using yarn
yarn add --dev nuxt-unhead
```

## Setup

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-unhead',
  ],
})
```

## Module Configuration

Config key: `unhead`

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  modules: ['nuxt-unhead'],

  unhead: {
    // config (see below)
  },
  //...
})
```

## Config

### seoOptimise

- Type: `boolean`
- Default: `true`

  Automatically optimise meta tags for SEO. 
  
  It will automatically infer the `og:title`, `og:description` when a title and description are set respectively. It will
  ensure a `twitter:card` is set to `summary_large_image` if not set.
  
  This will do more in the future.

### resolveAliases

- Type: `boolean`
- Default: `true`

  Resolve aliases in `href` and `src` attributes. This will allow you to load your asset files directly using aliases.

  ```vue
  <script lang="ts" setup>
  useHead({
    link: [
      {
        rel: 'stylesheet',
        href: '~/assets/style.css',
      },
    ]
  })
  </script>
  ```
  
### ogTitleTemplate

- Type: `string`
- Default: `%s`

  Template for the `og:title` meta tag. This will be used when inferring the og:title from title.

  ```ts
  defineNuxtConfig({
    unhead: {
      ogTitleTemplate: '%s - My cool site',
    },
  })
  ```

  ```vue
  <script lang="ts" setup>
  useHead({
    // og:title will be "My Title - My cool site"
    title: 'My Title',
  })
  </script>
  ```

### ogDescriptionTemplate

- Type: `string`
- Default: `%s`

  Template for the `og:description` meta tag. This will be used when inferring the og:description from description.

  ```ts
  defineNuxtConfig({
    unhead: {
      ogDescriptionTemplate: '%s. Check out my cool site',
    },
  })
  ```

  ```vue
  <script lang="ts" setup>
  useHead({
    // og:description will be "My Description. Check out my cool site"
    meta: [ { name: 'description', content: 'My Description' } ],
  })
  </script>
  ```

## Composables

### useSeoMeta

Define your meta tags as a flat object. This function is automatically imported for you.

Behind the scenes, this unpacks your meta tags and adds them as if you used `useHead` directly.

Powered by [packrup](https://github.com/harlan-zw/packrup) and [zhead](https://github.com/harlan-zw/zhead).

```ts
useSeoMeta({
  ogImage: "https://nuxtjs.org/meta_400.png",
  ogUrl: "https://nuxtjs.org",
  ogSiteName: "NuxtJS",
  ogType: "website",
  ogLocale: "en_US",
  ogLocaleAlternate: "fr_FR",
  twitterSite: "@nuxt_js",
})
```

## Components

### DebugHead

A component to debug your head tags.

<img src="https://raw.githubusercontent.com/harlan-zw/nuxt-unhead/main/.github/component.png" alt="DebugHead Component preview">

```vue
<template>
  <DebugHead />
</template>
```

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
