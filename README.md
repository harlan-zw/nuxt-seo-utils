<h1 align='center'>🌳 nuxt-headge</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-headge/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-headge" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-headge?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-headge" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-headge?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-headge" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-headge?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Nuxt v3 hea_d-_edge module to play with new experimental features.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> Early Access</b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

## Features

- 💎 Latest [@vueuse/head](https://github.com/vueuse/head) features
- 🧙 Define your meta tags as a flat object `useMetaTags`
- ✨ Automatic social share meta tags
- 🤖 Debug head tags component `DebugHead`
- 🌳 Fully typed with `href` and `src` file auto-completion

Coming soon:
- 🪝 New hooks: `head:tags`, `head:dom`
- 📦 Support resolving aliases
- 🖥️ Server Only Head tags

## Install

```bash
npm install --save-dev nuxt-headge

# Using yarn
yarn add --dev nuxt-headge
```

## Add Module

Because this module is replacing an internal Nuxt one, the setup is slightly different.

We need to hook into the internal modules and replace `meta` with `nuxt-headge`.

```ts
export default defineNuxtConfig({
  // ...
  hooks: {
    'modules:before': async ({ nuxt }) => {
      // swap out the nuxt internal module for nuxt-headge
      for (const k in nuxt.options._modules) {
        if (typeof nuxt.options._modules[k] === 'function' && (await nuxt.options._modules[k].getMeta()).name === 'meta')
          nuxt.options._modules[k] = 'nuxt-headge'
      }
    },
  },
})
```


## Config

### `seoOptimise`

- Type: `boolean`
- Default: `true`

  Automatically optimise meta tags for SEO. 
  
  It will automatically infer the `og:title`, `og:description` when a title and description are set respectively. It will
  ensure a `twitter:card` is set to `summary_large_image` if not set.
  
  This will do more in the future.

## Composables

### useHead

Usage of the composable remains the same but offers better TypeScript support.

### useMetaTags

Define your meta tags as a flat object. This function is automatically imported for you.

Behind the scenes, this unpacks your meta tags and adds them as if you used `useHead` directly.

Powered by [packrup](https://github.com/harlan-zw/packrup) and [zhead](https://github.com/harlan-zw/zhead).

```ts
useMetaTags({
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
