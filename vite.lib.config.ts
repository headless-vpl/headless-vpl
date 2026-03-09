import { resolve } from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: {
        'headless-vpl': resolve(__dirname, 'src/lib/headless-vpl/index.ts'),
        primitives: resolve(__dirname, 'src/lib/headless-vpl/primitives.ts'),
        helpers: resolve(__dirname, 'src/lib/headless-vpl/helpers.ts'),
        recipes: resolve(__dirname, 'src/lib/headless-vpl/recipes.ts'),
        blocks: resolve(__dirname, 'src/lib/headless-vpl/blocks.ts'),
        'util/mouse': resolve(__dirname, 'src/lib/headless-vpl/util/mouse.ts'),
        'util/animate': resolve(__dirname, 'src/lib/headless-vpl/util/animate.ts'),
        'util/dnd': resolve(__dirname, 'src/lib/headless-vpl/util/dnd.ts'),
        'util/collision_detecion': resolve(
          __dirname,
          'src/lib/headless-vpl/util/collision_detecion.ts'
        ),
        'util/domController': resolve(__dirname, 'src/lib/headless-vpl/util/domController.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    copyPublicDir: false,
    rollupOptions: {
      external: [],
    },
  },
})
