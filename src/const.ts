import { classifyIconFilename } from './build-time/iconAssets'

export const MetaTagFileDeepGlobs = [
  '**/{og-image,opengraph-image,twitter-image}.{png,jpg,jpeg,gif}',
  '**/{favicon,icon*}.{ico,jpg,jpeg,png,svg}',
  '**/*.icon*.{ico,jpg,jpeg,png,svg}',
  '**/apple-*.{jpg,jpeg,png}',
  '**/*.apple-*.{jpg,jpeg,png}',
]

// Matches meta tag files in a flat directory listing (no glob needed)
const SOCIAL_IMAGE_RE = /^(?:og-image|opengraph-image|twitter-image)\.(?:png|jpe?g|gif)$/

export function isMetaTagFile(filename: string): boolean {
  return SOCIAL_IMAGE_RE.test(filename) || classifyIconFilename(filename) !== undefined
}
