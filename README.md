<h1>nuxt-seo-utils</h1>

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]
[![Nuxt][nuxt-src]][nuxt-href]

Nuxt SEO Utils is a collection of defaults and utilities to improve your Nuxt site's discoverability and shareability.

While there are several features covering many aspects of SEO, it covers important defaults such as [automatic canonical URLs](https://nuxtseo.com/learn/controlling-crawlers/canonical-urls) and
[open graph tags](https://nuxtseo.com/learn/mastering-meta/open-graph).

<p align="center">
<table>
<tbody>
<td align="center">
<sub>Made possible by my <a href="https://github.com/sponsors/harlan-zw">Sponsor Program 💖</a><br> Follow me <a href="https://twitter.com/harlan_zw">@harlan_zw</a> 🐦 • Join <a href="https://discord.gg/275MBUBvgP">Discord</a> for help</sub><br>
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
- 🍞 Breadcrumb composable
- 🧙 Best practice defaults and enhanced titles
- ⚡ Inline minification of `<script>` and `<style>` tags (esbuild + lightningcss at build, lightweight runtime fallback)

## Installation

Install `nuxt-seo-utils` dependency to your project:

```bash
npx nuxi@latest module add nuxt-seo-utils
```

> [!TIP]
> Generate an Agent Skill for this package using [skilld](https://github.com/harlan-zw/skilld):
> ```bash
> npx skilld add nuxt-seo-utils
> ```

💡 Need a complete SEO solution for Nuxt? Check out [Nuxt SEO](https://nuxtseo.com).

## Documentation

[📖 Read the full documentation](https://nuxtseo.com/docs/seo-utils) for more information.

## Demos

[Basic](https://stackblitz.com/edit/nuxt-starter-vbay3q?file=app.vue)

## Sponsors

<p align="center">
  <a href="https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg">
    <img src='https://raw.githubusercontent.com/harlan-zw/static/main/sponsors.svg'/>
  </a>
</p>

## License

Licensed under the [MIT license](https://github.com/harlan-zw/nuxt-seo-utils/blob/main/LICENSE.md).

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/nuxt-seo-utils/latest.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-version-href]: https://npmjs.com/package/nuxt-seo-utils

[npm-downloads-src]: https://img.shields.io/npm/dm/nuxt-seo-utils.svg?style=flat&colorA=18181B&colorB=28CF8D
[npm-downloads-href]: https://npmjs.com/package/nuxt-seo-utils

[license-src]: https://img.shields.io/github/license/harlan-zw/nuxt-seo-utils.svg?style=flat&colorA=18181B&colorB=28CF8D
[license-href]: https://github.com/harlan-zw/nuxt-seo-utils/blob/main/LICENSE.md

[nuxt-src]: https://img.shields.io/badge/Nuxt-18181B?logo=nuxt
[nuxt-href]: https://nuxt.com
