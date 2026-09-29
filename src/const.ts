import { classifyIconFilename } from './build-time/iconAssets'

export const MetaTagFileDeepGlobs = [
  '**/{og-image,opengraph-image,twitter-image}.{png,jpg,jpeg,gif}',
  '**/{favicon*,icon*}.{ico,jpg,jpeg,png,svg}',
  '**/*.icon*.{ico,jpg,jpeg,png,svg}',
  '**/apple-*.{jpg,jpeg,png}',
  '**/*.apple-*.{jpg,jpeg,png}',
]

const SOCIAL_IMAGE_RE = /^(og-image|opengraph-image|twitter-image)\.(?:png|jpe?g|gif)$/

export type SocialImageProperty = 'ogImage' | 'twitterImage'

// The one list of social image file names, shared by public/ and pages/ scanning.
export function classifySocialImageFilename(filename: string): SocialImageProperty | undefined {
  const keyword = SOCIAL_IMAGE_RE.exec(filename)?.[1]
  if (!keyword)
    return
  return keyword === 'twitter-image' ? 'twitterImage' : 'ogImage'
}

export function isMetaTagFile(filename: string): boolean {
  return classifySocialImageFilename(filename) !== undefined || classifyIconFilename(filename) !== undefined
}
