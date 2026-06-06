// Library-only size guard: measures the bundled library with Svelte and the
// optional xlsx peer externalized — i.e. what a consumer pays on top of Svelte.
// This is the number the "tiny" claim rests on; keep it honest.
//
// Heavy optional UI (the filter menu, etc.) is dynamic-imported by Grid, so it
// code-splits into its own chunk and a consumer only downloads it on use. To
// reflect that, the budget counts the EAGER core only — the entry plus the
// chunks it statically imports — and reports lazy chunks separately.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIR = 'lib-dist';
// Recalibrated as the library matured from a minimal Phase-0 core into a full
// grid: 16 → 20 (sort/selection/footer/…), then 20 → 24 (master-detail,
// pagination, tree data). At ~24 KB gzip it is still ~20× smaller than AG Grid
// (~500 KB) — the "tiny" claim holds with room for the remaining big features.
const BUDGET_KB = { js: 24, css: 5 }; // gzipped, Svelte excluded, eager core only

const gzipKb = (path) => gzipSync(readFileSync(path)).length / 1024;
const jsFiles = readdirSync(DIR).filter((f) => f.endsWith('.js'));

// Static imports only: `import ... from './x'` / `export ... from './x'` and the
// bare `import './x'`. A dynamic `import('./x')` has a `(` after `import`, so it
// is deliberately NOT matched — that's how we separate lazy chunks from the core.
function staticDeps(code) {
  const deps = new Set();
  for (const m of code.matchAll(/from\s*["']\.\/([^"']+)["']/g)) deps.add(m[1]);
  for (const m of code.matchAll(/import\s*["']\.\/([^"']+)["']/g)) deps.add(m[1]);
  return [...deps];
}

// Eager closure: BFS from the entry, following static imports only.
const eager = new Set();
const queue = ['bo-grid.js'];
while (queue.length) {
  const f = queue.pop();
  if (eager.has(f) || !jsFiles.includes(f)) continue;
  eager.add(f);
  for (const d of staticDeps(readFileSync(`${DIR}/${f}`, 'utf8'))) {
    if (jsFiles.includes(d)) queue.push(d);
  }
}

let coreJs = 0;
let lazyJs = 0;
const lazy = [];
for (const f of jsFiles) {
  const kb = gzipKb(`${DIR}/${f}`);
  if (eager.has(f)) coreJs += kb;
  else {
    lazyJs += kb;
    lazy.push([f, kb]);
  }
}
let css = 0;
for (const f of readdirSync(DIR)) if (f.endsWith('.css')) css += gzipKb(`${DIR}/${f}`);

let failed = false;
console.log('library size (gzip, Svelte external — eager core)');
for (const [name, kb, budget] of [
  ['JS ', coreJs, BUDGET_KB.js],
  ['CSS', css, BUDGET_KB.css],
]) {
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(`  ${ok ? '✓' : '✗'} ${name}  ${kb.toFixed(2)} KB / ${budget} KB  (${Math.round((kb / budget) * 100)}%)`);
}
if (lazy.length) {
  console.log(`  · lazy (loaded on use, not budgeted): ${lazyJs.toFixed(2)} KB`);
  for (const [f, kb] of lazy) console.log(`      ${f.replace(/-[^.]+(?=\.js$)/, '')}  ${kb.toFixed(2)} KB`);
}

if (failed) {
  console.error('\n✗ library budget exceeded');
  process.exit(1);
}
console.log('\n✓ within budget');
