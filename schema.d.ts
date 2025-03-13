declare module '@nuxt/schema' {
  interface AppHeadMetaObject { seoMeta?: import('./src/runtime/types').MetaFlat }
}

declare module 'nuxt/schema' {
  interface AppHeadMetaObject { seoMeta?: import('./src/runtime/types').MetaFlat }
}

export {}
