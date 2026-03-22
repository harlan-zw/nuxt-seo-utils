import { defineVitestProject } from '@nuxt/test-utils/config'
import { defineConfig, defineProject } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    reporters: 'dot',
    projects: [
      defineProject({
        test: {
          name: 'unit',
          include: [
            './test/unit/**/*.test.ts',
            './src/**/*.test.ts',
          ],
        },
      }),
      defineVitestProject({
        test: {
          name: 'e2e',
          include: [
            './test/e2e/**/*.test.ts',
          ],
          environment: 'nuxt',
          environmentOptions: {
            nuxt: {
              rootDir: './test/fixtures/basic',
            },
          },
        },
      }),
    ],
  },
})
