export interface I18nTranslator {
  t: (key: string, defaultMessage: string, options?: Record<string, unknown>) => string
  te?: (key: string) => boolean
}

/**
 * Look up an optional i18n message without passing untrusted fallback text to
 * `vue-i18n`'s message compiler (which parses `|`, `{`, `}`, and `@` syntax).
 */
export function resolveI18nMessage(i18n: I18nTranslator | undefined, key: string): string | undefined {
  if (!i18n)
    return undefined
  if (typeof i18n.te === 'function' && !i18n.te(key))
    return undefined
  // Pass an empty default string so custom translators without `te` still never
  // compile fallback text (such as URL path segments).
  return i18n.t(key, '', { missingWarn: false, fallbackWarn: false }) || undefined
}
