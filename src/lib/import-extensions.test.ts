import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// svelte-package copies import paths into dist as they are written here. Node.js
// ESM and TypeScript's node16/nodenext resolution need the extension on every
// relative import (`./column.js` for column.ts, `./dir/index.js` for a folder);
// without it, `bo-grid/realtime` fails to load in Node and the published types
// turn into `any` (issue #87). Bundlers accept both, so only this test notices.

const LIB = dirname(fileURLToPath(import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.(ts|svelte)$/.test(e.name) && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\bvi\.mock\(\s*)(['"])(\.\.?\/[^'"\n]*)\1/g;

/** Why `spec`, imported from `file`, won't resolve outside a bundler, or null. */
function problem(file: string, spec: string): string | null {
  const path = spec.split('?')[0];
  const target = resolve(dirname(file), path);
  if (/\.(css|json|svg)$/.test(path)) return null;
  if (path.endsWith('.svelte')) return existsSync(target) ? null : `no ${path} (a .svelte.ts module is imported as .svelte.js)`;
  if (!path.endsWith('.js')) return 'no extension';
  const base = target.slice(0, -'.js'.length);
  return existsSync(base + '.ts') || existsSync(base + '.js') ? null : `nothing at ${path}`;
}

describe('relative imports under src/lib', () => {
  it('carry the extension Node.js resolves', () => {
    const bad: string[] = [];
    for (const file of sources(LIB)) {
      for (const m of readFileSync(file, 'utf8').matchAll(IMPORT)) {
        const why = problem(file, m[2]);
        if (why) bad.push(`${file.slice(LIB.length + 1)}: '${m[2]}': ${why}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
