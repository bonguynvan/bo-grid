// Library-only size guard: measures the bundled library with Svelte and the
// optional xlsx peer externalized — i.e. what a consumer pays on top of Svelte.
// This is the number the "tiny" claim rests on; keep it honest.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIR = 'lib-dist';
// Recalibrated once (16 → 20 KB) after the library matured from a minimal Phase-0
// core into a full grid (multi-sort, row selection, column show/hide, totals
// footer, row/cell callbacks, …). At ~20 KB gzip it is still ~25× smaller than
// AG Grid (~500 KB) — the "tiny" claim holds with room for a few more features.
const BUDGET_KB = { js: 20, css: 4 }; // gzipped, Svelte excluded

function gzipKb(path) {
  return gzipSync(readFileSync(path)).length / 1024;
}

let js = 0;
let css = 0;
for (const f of readdirSync(DIR)) {
  if (f.endsWith('.js')) js += gzipKb(`${DIR}/${f}`);
  else if (f.endsWith('.css')) css += gzipKb(`${DIR}/${f}`);
}

let failed = false;
console.log('library size (gzip, Svelte external)');
for (const [name, kb, budget] of [
  ['JS ', js, BUDGET_KB.js],
  ['CSS', css, BUDGET_KB.css],
]) {
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(`  ${ok ? '✓' : '✗'} ${name}  ${kb.toFixed(2)} KB / ${budget} KB  (${Math.round((kb / budget) * 100)}%)`);
}

if (failed) {
  console.error('\n✗ library budget exceeded');
  process.exit(1);
}
console.log('\n✓ within budget');
