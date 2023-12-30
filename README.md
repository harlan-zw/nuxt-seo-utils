<h1 align='center'>nuxt-seo-experiments</h1>

<p align="center">
<a href='https://github.com/harlan-zw/nuxt-seo-experiments/actions/workflows/test.yml'>
</a>
<a href="https://www.npmjs.com/package/nuxt-seo-experiments" target="__blank"><img src="https://img.shields.io/npm/v/nuxt-seo-experiments?style=flat&colorA=002438&colorB=28CF8D" alt="NPM version"></a>
<a href="https://www.npmjs.com/package/nuxt-seo-experiments" target="__blank"><img alt="NPM Downloads" src="https://img.shields.io/npm/dm/nuxt-seo-experiments?flat&colorA=002438&colorB=28CF8D"></a>
<a href="https://github.com/harlan-zw/nuxt-seo-experiments" target="__blank"><img alt="GitHub stars" src="https://img.shields.io/github/stars/harlan-zw/nuxt-seo-experiments?flat&colorA=002438&colorB=28CF8D"></a>
</p>

<p align="center">
Powerful SEO DX improvements that may or may not land in the Nuxt core.
</p>

<p align="center">
<table>
<tbody>
<td align="center">
<img width="800" height="0" /><br>
<i>Status:</i> <a href="https://github.com/harlan-zw/nuxt-seo-experiments/releases/tag/v3.0.0">v3 Released</a> <br>
<sup> Please report any issues 🐛</sup><br>
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
<img width="800" height="0" />
</td>
</tbody>
</table>
</p>

## Features

- ▲ Next.js inspired [Metadata Files](https://nextjs.org/docs/app/api-reference/file-conventions/metadata)
- ✨ Use SEO meta in your nuxt.config (`app.seoMeta`) and route rules
- 🤖 Adds meta tags (`og:title`, `og:description`, etc.) from page title and description
- 🧙 Correct tags that need to be absolute (i.e `og:image`)
- 🧩 Site config template params `useHead({ title: '%site.title' })`

## Installation

1. Install `nuxt-seo-experiments` dependency to your project:

```bash
#
yarn add -D nuxt-seo-experiments
#
npm install -D nuxt-seo-experiments
#
pnpm i -D nuxt-seo-experiments
```

2. Add it to your `modules` section in your `nuxt.config`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-seo-experiments']
})
```

# Documentation

[📖 Read the full documentation](https://nuxtseo.com/experiments) for more information.

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>

## License

MIT License © 2022-PRESENT [Harlan Wilton](https://github.com/harlan-zw)
