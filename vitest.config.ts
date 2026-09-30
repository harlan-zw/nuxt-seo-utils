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
            './devtools/lib/**/*.test.ts',
          ],
        },
      }),
      defineProject({
        test: {
          name: 'e2e',
          // E2E files build the same Nuxt fixture and share its .nuxt directory.
          fileParallelism: false,
          include: [
            './test/e2e/**/*.test.ts',
          ],
        },
      }),
    ],
  },
})
