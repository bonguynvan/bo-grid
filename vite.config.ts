import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: { port: 5180 },
  // Demo/playground build only. The publishable library is built separately by
  // `pnpm package` (svelte-package) into dist/ — keep the two outputs apart so
  // the demo build never clobbers the package.
  build: { outDir: 'demo-dist', emptyOutDir: true },
});
