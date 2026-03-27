export const MetaTagFileDeepGlobs = [
  '**/og-image.{png,jpg,jpeg,gif}',
  '**/opengraph-image.{png,jpg,jpeg,gif}',
  '**/twitter-image.{png,jpg,jpeg,gif}',
  '**/apple-icon.{jpg,jpeg,png}',
  '**/apple-touch.{jpg,jpeg,png}',
  '**/apple-touch-*.{jpg,jpeg,png}',
  '**/apple-touch-icon.{jpg,jpeg,png}',
  '**/apple-touch-icon-*.{jpg,jpeg,png}',
  '**/icon.{ico,jpg,jpeg,png,svg}',
  '**/icon-*.{ico,jpg,jpeg,png,svg}',
]

// Matches meta tag files in a flat directory listing (no glob needed)
const META_TAG_FILE_RE = /^(?:(?:og-image|opengraph-image)\.(?:png|jpe?g|gif)|twitter-image\.(?:png|jpe?g|gif)|apple-(?:icon|touch|touch-icon)(?:-[^.]+)?\.(?:jpe?g|png)|icon(?:-[^.]+)?\.(?:ico|jpe?g|png|svg)|favicon\.ico)$/

export function isMetaTagFile(filename: string): boolean {
  return META_TAG_FILE_RE.test(filename)
}
