import type { ArgDef } from 'citty'
import { writeFile } from 'node:fs/promises'
import process from 'node:process'
import { loadNuxtConfig } from '@nuxt/kit'
import c from 'ansis'
import { defineCommand, runMain } from 'citty'
import { $fetch } from 'ofetch'
import { resolve } from 'pathe'
import { x } from 'tinyexec'
import { withBase } from 'ufo'
import { description, name, version } from '../package.json'

const ICON_SIZES = [
  { name: 'favicon-16x16.png', width: 16, height: 16 },
  { name: 'favicon-32x32.png', width: 32, height: 32 },
  { name: 'apple-touch-icon.png', width: 180, height: 180 },
  { name: 'android-chrome-192x192.png', width: 192, height: 192 },
  { name: 'android-chrome-512x512.png', width: 512, height: 512 },
]

export const cwdArgs = {
  cwd: {
    type: 'string',
    description: 'Specify the working directory',
    valueHint: 'directory',
    default: '.',
  },
} as const satisfies Record<string, ArgDef>

function waitForServerUrl(proc: ReturnType<typeof x>): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('IPX server did not start within 10s')), 10_000)

    if (!proc.process?.stdout) {
      clearTimeout(timeout)
      reject(new Error('Process stdout is not available'))
      return
    }

    proc.process.stdout.on('data', (data: Buffer) => {
      const line = data.toString()
      if (line.includes('Local:')) {
        clearTimeout(timeout)
        const url = line.trim().split('\n')[0].split(' ').pop()
        resolve(url!)
      }
    })
  })
}

async function fetchAndSave(baseUrl: string, sourcePath: string, width: number, height: number, outputPath: string) {
  const ipxPath = `/s_${width}x${height}/${sourcePath}`
  const data = await $fetch(withBase(ipxPath, baseUrl), {
    responseType: 'arrayBuffer',
  })
  await writeFile(outputPath, Buffer.from(data))
}

const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
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
        const cwd = resolve(ctx.args.cwd)
        const nuxtConfig = await loadNuxtConfig({ cwd })
        const publicDir = nuxtConfig.alias?.public || resolve(cwd, 'public')
        const source = ctx.args.source

        console.log(c.cyan(`Generating icons from ${c.bold(source)}...`))

        const aborter = new AbortController()
        const proc = x('npx', ['ipx', 'serve', '--dir', publicDir], {
          nodeOptions: {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd,
            detached: true,
          },
          throwOnError: true,
          signal: aborter.signal,
        })

        const cleanup = () => {
          aborter.abort()
          proc.kill()
        }
        process.on('SIGINT', cleanup)
        process.on('SIGTERM', cleanup)

        const url = await waitForServerUrl(proc).catch((err) => {
          cleanup()
          console.error(c.red(String(err)))
          process.exit(1)
        })

        console.log(c.dim(`IPX server running at ${url}`))

        for (const icon of ICON_SIZES) {
          const outputPath = resolve(publicDir, icon.name)
          await fetchAndSave(url, source, icon.width, icon.height, outputPath)
          console.log(c.green(`  ${icon.name} (${icon.width}x${icon.height})`))
        }

        cleanup()
        console.log(c.green.bold('\nDone! Generated all icon variants.'))
      },
    }),
  },
})

runMain(main)
