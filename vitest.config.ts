import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/lib/headless-vpl/**/*.test.ts', 'src/pages/samples/block-editor/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/headless-vpl/**/*.ts', 'src/pages/samples/block-editor/**/*.ts'],
      exclude: [
        'src/lib/headless-vpl/**/*.test.ts',
        'src/lib/headless-vpl/rendering/**',
        'src/pages/samples/block-editor/**/*.test.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
      },
    },
  },
})
