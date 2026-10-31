import { useRuntimeConfig } from 'nuxt/server'

const config = useRuntimeConfig()
export const apiBase: string = config.public.apiBase
export const retryLimit: number = config.public.retryLimit
export const enabled: boolean = config.public.nested.enabled
// @ts-expect-error Public runtime config must retain its string type.
export const invalidApiBase: number = config.public.apiBase
