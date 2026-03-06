import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/headless-vpl/index.ts'),
      formats: ['es'],
      fileName: () => 'headless-vpl.js',
    },
    copyPublicDir: false,
    rollupOptions: {
      external: [],
    },
  },
})
