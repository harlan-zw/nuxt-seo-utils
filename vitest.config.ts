/* eslint-disable spaced-comment */
/// <reference types="vitest" />
/// <reference types="vitest/globals" />

import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    watchExclude: [
      '**/.nuxt/**',
      '**/.output/**'
    ],
  },
})
