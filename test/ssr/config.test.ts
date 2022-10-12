/**
 * Note: These tests are the same as basic.test.ts, but they run on the browser and check for console errors.
 * This is seperated as the CI will occasionally hang forever due to the browser.
 */

import { describe, expect, it } from 'vitest'
import { $fetchPath, setupTestSSR } from '../utils'

await setupTestSSR({
  nuxtConfig: {
    app: {
      head: {
        viewport: 'width=device-width, initial-scale=0.5',
        charset: 'utf-16',
      },
    },
  },
})

describe('config', () => {
  it('shortcuts work', async () => {
    const $ = await $fetchPath('/')
    expect($('meta[name="viewport"]').attr('content')).toEqual('width=device-width, initial-scale=0.5')
    expect($('meta[charset="utf-16"]')).toBeDefined()
  })
})
