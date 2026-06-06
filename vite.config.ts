import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';

// Single source of truth for the demo/API-page version label — read from
// package.json so it can never drift. Injected into JS via `define` and into the
// static HTML (api.html) by replacing the `__BO_GRID_VERSION__` token.
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;

export default defineConfig({
  plugins: [
    svelte(),
    {
      name: 'bo-grid-version-html',
      transformIndexHtml: (html) => html.replace(/__BO_GRID_VERSION__/g, version),
    },
  ],
  define: { __BO_GRID_VERSION__: JSON.stringify(version) },
  server: { port: 5180 },
  // Demo/playground build only. The publishable library is built separately by
  // `pnpm package` (svelte-package) into dist/ — keep the two outputs apart so
  // the demo build never clobbers the package.
  build: {
    outDir: 'demo-dist',
    emptyOutDir: true,
    // The gallery code-splits its examples into lazy chunks. Two settings keep
    // that working under the jsdom smoke (which loads the bundle from a file://
    // origin where Vite's preload helper can't fetch): merge all CSS into one
    // entry stylesheet (no per-chunk CSS to load), and disable module-preload so
    // dynamic imports are plain import() calls with no preload/fetch helper.
    cssCodeSplit: false,
    modulePreload: false,
    // Multi-page: the demo (index.html) + the static API reference (api.html).
    rollupOptions: { input: { index: 'index.html', api: 'api.html' } },
  },
});
