import { spawn } from 'node:child_process'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import process from 'node:process'

const fixtureDir = import.meta.dirname
const fixtureFiles = [
  'app.vue',
  'module.tgz',
  'nuxt.config.ts',
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'test.mjs',
]

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${command} failed with ${signal || `exit code ${code}`}`))
    })
  })
}

async function main() {
  const tempDir = await mkdtemp(join(tmpdir(), 'nuxt-seo-utils-nuxt5-'))

  try {
    await Promise.all(fixtureFiles.map(file => cp(join(fixtureDir, file), join(tempDir, basename(file)))))
    await run('pnpm', ['install', '--frozen-lockfile'], tempDir)
    await run('pnpm', ['test'], tempDir)
  }
  finally {
    await rm(tempDir, { force: true, recursive: true })
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
