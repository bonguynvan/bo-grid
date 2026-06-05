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
      entry: 'src/lib/index.ts',
      formats: ['es'],
      fileName: () => 'bo-grid.js',
    },
    rollupOptions: {
      external: ['svelte', /^svelte\//, 'xlsx'],
    },
  },
});
