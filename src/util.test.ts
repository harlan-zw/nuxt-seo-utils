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
    ['PNG', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X8TqNwAAAABJRU5ErkJggg==', 'base64'), 1, 1],
    ['GIF', Buffer.from('47494638396103000200', 'hex'), 3, 2],
    ['JPEG', Buffer.from('ffd8ffc0000b080002000301011100', 'hex'), 3, 2],
    ['SVG', Buffer.from('<svg viewBox="0 0 32 24"></svg>'), 32, 24],
    ['SVG absolute units', Buffer.from('<svg width="2in" height="1in"></svg>'), 192, 96],
    ['SVG inferred height', Buffer.from('<svg width="100" viewBox="0 0 3 2"></svg>'), 100, 66],
  ])('reads %s dimensions', async (format, payload, width, height) => {
    const path = resolve(fixtureRoot, `valid-${format.toLowerCase()}`)
    await writeFile(path, payload)

    await expect(getImageDimensions(path)).resolves.toMatchObject({ width, height })
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
    [
      'JXL',
      Buffer.from('000000004a584c20', 'hex'),
    ],
    [
      'JPEG zero-length segment',
      Buffer.from('ffd8ffe00000', 'hex'),
    ],
    [
      'PNG without an IHDR chunk',
      Buffer.from('89504e470d0a1a0a0000000d4e4f50450000000300000002', 'hex'),
    ],
    [
      'JPEG without components',
      Buffer.from('ffd8ffc00008080002000300', 'hex'),
    ],
    [
      'ICO with a missing image payload',
      Buffer.from('00000100010010100000010020000400000016000000', 'hex'),
    ],
    [
      'SVG with non-finite dimensions',
      Buffer.from('<svg viewBox="0 0 1e309 24"></svg>'),
    ],
  ])('rejects malformed %s input', async (format, payload) => {
    const path = resolve(fixtureRoot, `malformed-${format.toLowerCase()}`)
    await writeFile(path, payload)

    await expect(getImageDimensions(path)).rejects.toThrow('Unsupported image format')
  })
})
