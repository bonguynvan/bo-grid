import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Builds the framework-agnostic custom element `<bo-grid>` as a single,
// self-contained ES module (Svelte runtime bundled in, since React/Vue/Angular
// consumers won't have Svelte). The optional `xlsx` peer stays a lazy import.
// Output lands in dist/ alongside the svelte-package output (emptyOutDir: false),
// so it ships with the package — see the `./element` export.
export default defineConfig({
  // emitCss: false → component styles are injected at runtime by the JS, so the
  // element is a single drop-in import (no separate stylesheet to include).
  // Compile ONLY the wrapper as a custom element; the inner Grid/Cell/… stay
  // regular components (a global customElement:true would break them).
  plugins: [
    svelte({
      emitCss: false,
      dynamicCompileOptions({ filename }) {
        if (filename.replace(/\\/g, '/').endsWith('src/wc/BoGrid.svelte')) {
          return { customElement: true };
        }
      },
    }),
  ],
  // Vite copies `publicDir` (default: repo-root `public/`) into `outDir` on
  // every build. `public/` holds the demo site's llms.txt/llms-full.txt —
  // meant for the GH Pages demo (see vite.config.ts), NOT for the published
  // npm package. Without this, they'd leak into dist/ and ship in the
  // tarball alongside the real library output.
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: 'esbuild',
    cssCodeSplit: false,
    lib: {
      entry: 'src/wc/element.ts',
      formats: ['es'],
      fileName: () => 'bo-grid.element.js',
    },
    rollupOptions: {
      external: ['xlsx'],
      output: { entryFileNames: 'bo-grid.element.js', chunkFileNames: 'bo-grid.[name]-[hash].js' },
    },
  },
});
