<h1 align='center'>nuxt-seo-experiments</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-seo-experiments/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-seo-experiments" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-seo-experiments?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-seo-experiments" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-seo-experiments?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-seo-experiments" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-seo-experiments?flat&colorA=002438&colorB=28CF8D"></a>
</p>


<p align="center">
Experimental SEO for Nuxt.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> Experimental</b> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

ℹ️ Looking for a complete SEO solution? Check out [Nuxt SEO Kit](https://github.com/harlan-zw/nuxt-seo-kit).

⚠️ This package was previously called nuxt-unhead.
It has been renamed to nuxt-seo-experiments to better reflect the scope of the package.

## Features

- ✨ Automatic social share meta tags
- 🧙 Automatic SEO tags based on public files
- 🌳 Fully typed Head Schema with `href` and `src` file auto-completion
- Public runtime data exposed to Template Params `NUXT_PUBLIC_SITE_TITLE=test` -> `title: %siteTitle`

## Background

This module was built to test bug fixes as well as experimental new features which may
land into the Nuxt core.

## Install

```bash
npm install --save-dev nuxt-seo-experiments

# Using yarn
yarn add --dev nuxt-seo-experiments
```

## Setup

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  modules: [
    'nuxt-seo-experiments',
  ],
})
```

## Module Configuration

Config key: `seoExperiments`

_nuxt.config.ts_

```ts
export default defineNuxtConfig({
  modules: ['nuxt-seo-experiments'],

  seoExperiments: {
    // config (see below)
  },
  //...
})
```

## Usage

## Config

### inferTagsFromFiles

- Type: `boolean`
- Default: `true`

  Automatically infer meta tags from public files. 
  
  For example, if you have a `favicon.ico` in your `public` directory, it will automatically infer the `favicon` meta tag.

### seoOptimise

- Type: `boolean`
- Default: `true`

  Automatically optimise meta tags for SEO. 
  
  It will automatically infer the `og:title`, `og:description` when a title and description are set respectively. It will
  ensure a `twitter:card` is set to `summary_large_image` if not set.
  
  This will do more in the future.


## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>


## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
