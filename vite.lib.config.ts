import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Builds the library as a single bundle with Svelte (the peer) and the optional
// xlsx peer externalized — i.e. what a consumer actually pays on top of Svelte.
// Used only to measure size; the published package ships unbundled via
// @sveltejs/package (see the `package` script).
export default defineConfig({
  plugins: [svelte()],
  build: {
    outDir: 'lib-dist',
    emptyOutDir: true,
    minify: 'esbuild',
    lib: {
      // Two entries: the grid core and the optional charts companion. Measured
      // separately by size-lib.mjs so each keeps its own budget.
      entry: { 'bo-grid': 'src/lib/index.ts', charts: 'src/lib/charts/index.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['svelte', /^svelte\//, 'xlsx'],
      output: { entryFileNames: '[name].js', chunkFileNames: '[name]-[hash].js' },
    },
  },
});
