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
<i>Status:</i> <a href="https://github.com/unjs/unhead/releases/tag/v1.1.0">Unhead v1.1 Released</a></b> <br>
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
- ✨ Automatic social share meta tags
- 🤖 Debug head tags component `DebugHead`
- 🌳 Fully typed Head Schema with `href` and `src` file auto-completion
- 🧩 Title template tokens: Use public runtime config in your templates: `%s %titleSeperator %siteName`.
- 🪝 Runtime hooks: `head:tags`, `head:entries`
- 📦 Load your asset files directly using aliases `href: '~/assets/style.css'` (Experimental)

## Background

This module was built to test bug fixes as well as experimental new features which may
land into the Nuxt core.

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

## Usage

### Template Params

When defining your `titleTemplate`, `title` or `meta` content as strings,
you can use tokens to reference values from your resolved runtime config.

For example, the default title template introduced by this module is `%s %titleSeparator %siteName`. 

This uses the following:
- `%s` - The title of the page.
- `%titleSeparator` - `runtimeConfig.public.titleSeparator`
- `%siteName` - `runtimeConfig.public.siteName`

To provide the values for these tokens, you can update them in your nuxt config.

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      siteName: 'My cool site',
      titleSeparator: '|',
    }
  },
})
```

You can read more about this feature on the docs: [Unhead Template Params](https://unhead.harlanzw.com/guide/guides/template-params).

## Config

### seoOptimise

- Type: `boolean`
- Default: `true`

  Automatically optimise meta tags for SEO. 
  
  It will automatically infer the `og:title`, `og:description` when a title and description are set respectively. It will
  ensure a `twitter:card` is set to `summary_large_image` if not set.
  
  This will do more in the future.

### resolveAliases - EXPERIMENTAL

- Type: `boolean`
- Default: `false`

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
