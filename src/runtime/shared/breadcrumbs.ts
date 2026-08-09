import type { RuntimeI18nConfig } from 'nuxtseo-shared/i18n-runtime'
import { localePath } from 'nuxtseo-shared/i18n-runtime'
import { hasTrailingSlash, parseURL, stringifyParsedURL, withTrailingSlash } from 'ufo'

interface BreadcrumbLocaleContext {
  locale?: string
  defaultLocale?: string
  strategy?: RuntimeI18nConfig['strategy']
  differentDomains?: boolean
}

export function resolveBreadcrumbRoot(rootNode: string, context: BreadcrumbLocaleContext): string {
  if (!context.locale || !context.strategy)
    return rootNode

  return localePath(rootNode, context.locale, {
    defaultLocale: context.defaultLocale || context.locale,
    strategy: context.strategy,
    locales: [],
    differentDomains: context.differentDomains,
  })
}

export function pathBreadcrumbSegments(path: string, rootNode: string = '/'): string[] {
  const startNode = parseURL(path)
  const appendsTrailingSlash = hasTrailingSlash(startNode.pathname)

  const stepNode = (node: ReturnType<typeof parseURL>, nodes: string[] = []): string[] => {
    const fullPath = stringifyParsedURL(node)
    // the pathname will always be without the trailing slash
    const currentPathName = node.pathname || '/'
    // when we hit the root the path will be an empty string; we swap it out for a slash
    nodes.push(fullPath || '/')
    if (currentPathName !== rootNode && currentPathName !== '/') {
      // strip the last path segment (/my/cool/path -> /my/cool)
      node.pathname = currentPathName.substring(0, currentPathName.lastIndexOf('/'))
      // if the input was provided with a trailing slash we need to honour that
      if (appendsTrailingSlash)
        node.pathname = withTrailingSlash(node.pathname.substring(0, node.pathname.lastIndexOf('/')))
      stepNode(node, nodes)
    }
    return nodes
  }
  return stepNode(startNode)
    .reverse()
}
