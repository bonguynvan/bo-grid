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
// grid: 16 → 20 (sort/selection/footer/…), 20 → 24 (master-detail, pagination,
// tree), then 24 → 28 (filtering, column management, spreadsheet power). At
// ~28 KB gzip it is still ~15–20× smaller than AG Grid (~500 KB) — the "tiny"
// claim holds. Heavy optional UI (filter menu, tool panel) stays lazy and is
// excluded below, so this is genuinely the always-loaded core.
// The grid core (`js`) is the always-loaded promise. The optional charts
// companion (`bo-grid/charts`) is a separate entry a consumer only pays for if
// they import it — budgeted on its own so it also stays tiny.
const BUDGET_KB = { js: 28, css: 6, charts: 8 }; // gzipped, Svelte excluded

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

// Eager closure: BFS from an entry, following static imports only.
function eagerClosure(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const f = queue.pop();
    if (seen.has(f) || !jsFiles.includes(f)) continue;
    seen.add(f);
    for (const d of staticDeps(readFileSync(`${DIR}/${f}`, 'utf8'))) {
      if (jsFiles.includes(d)) queue.push(d);
    }
  }
  return seen;
}

const core = eagerClosure('bo-grid.js');
const chartsSet = jsFiles.includes('charts.js') ? eagerClosure('charts.js') : new Set();

let coreJs = 0;
let chartsJs = 0;
let lazyJs = 0;
const lazy = [];
for (const f of jsFiles) {
  const kb = gzipKb(`${DIR}/${f}`);
  if (core.has(f)) coreJs += kb;
  else if (chartsSet.has(f)) chartsJs += kb;
  else {
    lazyJs += kb;
    lazy.push([f, kb]);
  }
}
let css = 0;
for (const f of readdirSync(DIR)) if (f.endsWith('.css')) css += gzipKb(`${DIR}/${f}`);

const rows = [
  ['JS   ', coreJs, BUDGET_KB.js],
  ['CSS  ', css, BUDGET_KB.css],
];
if (chartsSet.size) rows.push(['charts', chartsJs, BUDGET_KB.charts]);

let failed = false;
console.log('library size (gzip, Svelte external — eager core)');
for (const [name, kb, budget] of rows) {
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
