import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/lib/headless-vpl/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/headless-vpl/**/*.ts'],
      exclude: ['src/lib/headless-vpl/**/*.test.ts', 'src/lib/headless-vpl/rendering/**'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
      },
    },
  },
})
