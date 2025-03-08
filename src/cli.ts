import type { ArgDef } from 'citty'
import process from 'node:process'
import { loadNuxtConfig } from '@nuxt/kit'
import c from 'ansis'
import { defineCommand, runMain } from 'citty'
import { $fetch } from 'ofetch'
import { relative, resolve } from 'pathe'
import { x } from 'tinyexec'
import { withBase } from 'ufo'
import { createStorage } from 'unstorage'
import fsDriver from 'unstorage/drivers/fs'
import { description, name, version } from '../package.json'
import {writeFile} from "node:fs/promises";

interface TwoslashVerifyError {
  file: string
  line: number
  error: any
}

export interface VerifyOptions {
  resolveNuxt?: boolean
  rootDir?: string
  buildDir?: string
  contentDir?: string
  watch?: boolean
  languages?: string
}

const realCwd = process.cwd()
const errors: TwoslashVerifyError[] = []

function printErrors() {
  console.error(c.red('Twoslash verification failed'))
  for (const error of errors) {
    console.error(c.yellow(`\n----------\nError in ${relative(realCwd, error.file)}:${error.line}`))
    console.error(c.red(String(error.error)))
  }
  console.error(c.yellow('----------'))
  console.error(c.red(`\nTwoslash verification failed with ${errors.length} errors.`))
  console.error(c.red(errors.map(e => `  - ${relative(realCwd, e.file)}:${e.line}`).join('\n')))
}

export const cwdArgs = {
  cwd: {
    type: 'string',
    description: 'Specify the working directory',
    valueHint: 'directory',
    default: '.',
  },
} as const satisfies Record<string, ArgDef>

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
        description: 'Generate missing icons from a single SVG file',
      },
      args: {
        ...cwdArgs,
      },
      async run(ctx) {
        const cwd = resolve(ctx.args.cwd || ctx.args.rootDir)
        // for layers
        const nuxtConfig = await loadNuxtConfig({ cwd })
        // `tinyexec` will resolve command from local binaries
        const aborter = new AbortController()
        const writeDir = nuxtConfig.alias.public
        const proc = x(`npx`, ['ipx', 'serve', '--dir', writeDir], {
          nodeOptions: {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd,
            detached: true,
          },
          throwOnError: true,
          signal: aborter.signal,
        })
        process.addListener('beforeExit', () => {
          aborter.abort()
        })
        proc.then(() => {
          console.log('process ready?')
        })
        console.log('process started', proc.pid)

        // Create a promise that resolves when the server is ready
        const serverReady = new Promise<string>((resolve) => {
          if (!proc.process || !proc.process.stdout) {
            console.warn(c.yellow('Process stdout is not available'))
            // Resolve with a default value after a timeout
            setTimeout(() => resolve('http://localhost:3000'), 2000)
            return
          }

          proc.process.stdout.on('data', (data) => {
            const line = data.toString()
            if (line.includes('Local:')) {
              const url = line.trim().split('\n')[0].split(' ').pop()
              console.log(c.cyan('Server started at'), c.blue(url))
              resolve(url)
            }
          })
        })

        // Wait for the server to be ready before proceeding
        const url = await serverReady
        if (!url) {
          return console.error(c.red('Failed to get server URL'))
        }
        // need to wait until the process is ready
        // watch the stdout until we get a line with Local:
        // this will be the server url
        console.log('image fetch')
        console.log('fetch', withBase(`/_/apple-touch.png`, url))
        // fetch images from path
        const original = await $fetch(withBase(`/_/apple-touch.png`, url), {
          responseType: 'arrayBuffer',
        })
        await writeFile(resolve(writeDir, 'apple-touch-original.png'), Buffer.from(original))
        const resized = await $fetch(withBase(`/s_120x120/apple-touch.png`, url), {
          responseType: 'arrayBuffer',
        })
        await writeFile(resolve(writeDir, 'apple-touch-120x120.png'), Buffer.from(resized))
        console.log('finished!')
        aborter.abort()
        proc.kill()
      },
    }),
  },
})

runMain(main)
