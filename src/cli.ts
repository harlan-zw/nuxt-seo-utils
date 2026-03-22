import type { ArgDef } from 'citty'
import { Buffer } from 'node:buffer'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { loadNuxtConfig } from '@nuxt/kit'
import c from 'ansis'
import { defineCommand, runMain } from 'citty'
import { resolve } from 'pathe'
import { description, name, version } from '../package.json'

const ICON_SIZES = [
  { name: 'icon-16x16.png', width: 16, height: 16 },
  { name: 'icon-32x32.png', width: 32, height: 32 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'icon-192x192.png', width: 192, height: 192 },
  { name: 'icon-512x512.png', width: 512, height: 512 },
]

const SUPPORTED_FORMATS = new Set(['svg', 'png', 'jpg', 'jpeg', 'webp'])

const cwdArgs = {
  cwd: {
    type: 'string',
    description: 'Specify the working directory',
    valueHint: 'directory',
    default: '.',
  },
} as const satisfies Record<string, ArgDef>

/**
 * Wraps PNG buffers in an ICO container. All modern browsers support PNG-in-ICO.
 */
function pngToIco(pngBuffers: Buffer[]): Buffer {
  const count = pngBuffers.length
  const headerSize = 6
  const dirEntrySize = 16
  const dataOffset = headerSize + dirEntrySize * count

  // ICO header: reserved(2) + type=1(2) + count(2)
  const header = Buffer.alloc(headerSize)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: ICO
  header.writeUInt16LE(count, 4)

  const dirEntries: Buffer[] = []
  let offset = dataOffset

  for (const png of pngBuffers) {
    const entry = Buffer.alloc(dirEntrySize)
    // Width/height: 0 means 256 in ICO spec, otherwise actual value
    const size = Math.min(256, 32) // we only generate 32x32
    entry.writeUInt8(size === 256 ? 0 : size, 0) // width
    entry.writeUInt8(size === 256 ? 0 : size, 1) // height
    entry.writeUInt8(0, 2) // color palette
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // color planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8) // data size
    entry.writeUInt32LE(offset, 12) // data offset
    dirEntries.push(entry)
    offset += png.length
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers])
}

async function loadSharp() {
  const mod = await import('sharp').catch(() => {
    console.error(c.red('sharp is required for icon generation. Install it with:'))
    console.error(c.cyan('  pnpm add -D sharp'))
    process.exit(1)
  })
  return mod.default
}

const main = defineCommand({
  meta: { name, version, description },
  args: {
    command: {
      type: 'positional',
      required: false,
    },
    ...cwdArgs,
  },
  subCommands: {
    icons: defineCommand({
      meta: {
        name: 'icons',
        description: 'Generate favicon and icon variants from a source image',
      },
      args: {
        ...cwdArgs,
        source: {
          type: 'string',
          description: 'Source image file relative to the public directory (e.g. logo.svg)',
          required: true,
        },
      },
      async run(ctx) {
        const cwd = resolve(String(ctx.args.cwd))
        const nuxtConfig = await loadNuxtConfig({ cwd })
        const publicDir = resolve(cwd, nuxtConfig.dir?.public ?? 'public')
        const source = String(ctx.args.source)
        const sourcePath = resolve(publicDir, source)

        if (!existsSync(sourcePath)) {
          console.error(c.red(`Source file not found: ${sourcePath}`))
          process.exit(1)
        }

        const ext = source.split('.').pop()?.toLowerCase()
        if (!ext || !SUPPORTED_FORMATS.has(ext)) {
          console.error(c.red(`Unsupported format "${ext}". Use: ${[...SUPPORTED_FORMATS].join(', ')}`))
          process.exit(1)
        }

        const sharp = await loadSharp()

        console.log(c.cyan(`Generating icons from ${c.bold(source)}...`))

        for (const icon of ICON_SIZES) {
          const outputPath = resolve(publicDir, icon.name)
          await sharp(sourcePath)
            .resize(icon.width, icon.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(outputPath)
          console.log(c.green(`  ${icon.name} (${icon.width}x${icon.height})`))
        }

        // Generate favicon.ico (PNG-in-ICO format)
        const faviconPng = await sharp(sourcePath)
          .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()
        await writeFile(resolve(publicDir, 'favicon.ico'), pngToIco([faviconPng]))
        console.log(c.green('  favicon.ico (32x32)'))

        console.log(c.green.bold('\nDone! Generated all icon variants.'))
      },
    }),
  },
})

runMain(main)
