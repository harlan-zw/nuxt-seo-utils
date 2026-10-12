const LOC_RE = /<loc>([^<]+)<\/loc>/g

function locs(xml: string): string[] {
  return [...xml.matchAll(LOC_RE)].map(match => match[1]!)
}

/** Every page path in the sitemap, following a sitemap index to its child sitemaps. */
export async function sitemapPaths(fetchText: (path: string) => Promise<string>): Promise<string[]> {
  const root = await fetchText('/sitemap.xml')
  const pages = root.includes('<sitemapindex')
    ? (await Promise.all(locs(root).map(loc => fetchText(new URL(loc).pathname)))).flatMap(locs)
    : locs(root)
  return [...new Set(pages.map(loc => new URL(loc).pathname))].sort()
}
