import { Buffer } from 'node:buffer'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { getImageDimensions } from './util'

describe('getImageDimensions', () => {
  let fixtureRoot: string

  beforeAll(async () => {
    fixtureRoot = await mkdtemp(resolve(tmpdir(), 'nuxt-seo-utils-'))
  })

  afterAll(async () => {
    await rm(fixtureRoot, { recursive: true })
  })

  it.each([
    [
      'ICNS',
      Buffer.from('69636e73000000106973333200000000', 'hex'),
    ],
    [
      'HEIF',
      Buffer.from('00000010667479706176696600000000000000246d657461000000000000000869707270000000146970636f000000006973706500000000000000000000000000000000', 'hex'),
    ],
  ])('rejects the malicious %s infinite loop payload', async (format, payload) => {
    const path = resolve(fixtureRoot, `malformed-${format.toLowerCase()}`)
    await writeFile(path, payload)

    await expect(getImageDimensions(path)).rejects.toThrow('Unsupported image format')
  })
})
