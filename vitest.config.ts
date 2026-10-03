import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  // Tests compile components without svelte.config.js: Svelte 5 reads the
  // type-only TypeScript in `<script lang="ts">` itself, and vitePreprocess
  // cannot preprocess styles outside a full Vite build. The browser condition
  // gives component tests (jsdom) Svelte's client runtime, with `mount`.
  plugins: [svelte({ configFile: false })],
  resolve: { conditions: ['browser'] },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
