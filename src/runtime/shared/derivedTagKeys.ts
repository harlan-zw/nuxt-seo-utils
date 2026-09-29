/**
 * Marks the `twitter:image` tags copied from a `public/` og-image.
 * They are dropped when another entry's `og:image` replaces that image.
 * Keys start with this prefix and end with the file name, so two files never merge.
 */
export const TWITTER_IMAGE_FALLBACK_KEY = 'nuxt-seo-utils:twitter-image-fallback'

/**
 * Marks the default `og:url`. It takes the href of the resolved canonical link.
 */
export const OG_URL_KEY = 'nuxt-seo-utils:og-url'
