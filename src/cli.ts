import type { ArgDef } from 'citty'
import { existsSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { loadNuxtConfig } from '@nuxt/kit'
import { defineCommand, runMain } from 'citty'
import { colors as c } from 'consola/utils'
import { resolve } from 'pathe'
import { description, name, version } from '../package.json'
import { pngToIco } from './build-time/iconAssets'

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

        console.log(c.cyan(`Generating icons from ${c.bold(String(source))}...`))

        for (const icon of ICON_SIZES) {
          const outputPath = resolve(publicDir, icon.name)
          await sharp(sourcePath)
            .resize(icon.width, icon.height, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toFile(outputPath)
          console.log(c.green(`  ${icon.name} (${icon.width}x${icon.height})`))
        }

        // Generate favicon.ico (PNG-in-ICO format)
        const faviconSizes = [16, 32, 48]
        const faviconPngs = await Promise.all(faviconSizes.map(async size => ({
          buffer: await sharp(sourcePath)
            .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer(),
          width: size,
          height: size,
        })))
        await writeFile(resolve(publicDir, 'favicon.ico'), pngToIco(faviconPngs))
        console.log(c.green('  favicon.ico (16x16, 32x32, 48x48)'))

        console.log(c.bold(c.green('\nDone! Generated all icon variants.')))
      },
    }),
  },
})

runMain(main)
