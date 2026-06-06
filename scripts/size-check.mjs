// Bundle-budget guard for the DEMO app. The real product-size promise — the
// gzipped library a consumer actually ships — is enforced separately and more
// tightly by `size:lib` (scripts/size-lib.mjs). This budget guards the demo
// entry chunk, which also bundles the Svelte runtime, the examples gallery
// (trading desk + portfolio + spreadsheet), and the demo data generators, so it
// is a looser ceiling that just catches accidental demo bloat.
//
// Measures the CORE entry chunk only (the `index-*` files). Lazy chunks loaded
// via dynamic import (e.g. SheetJS for xlsx export) are intentionally excluded —
// they never load unless that feature is used, so they shouldn't count.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIR = 'demo-dist/assets';
// Demo entry chunk: Svelte runtime + the landing page (hero/nav/footer) + the
// eager default example + the library + demo data. The shipped-library promise is
// the tight one and lives in size:lib; this is a looser anti-bloat ceiling for
// the demo. Bumped 40→45 when the GitHub Pages landing page was added (markup,
// not shipped to npm consumers).
const BUDGET_KB = { js: 45, css: 8 }; // gzipped

function gzipKb(path) {
  return gzipSync(readFileSync(path)).length / 1024;
}

let js = 0;
let css = 0;
for (const f of readdirSync(DIR)) {
  // Entry JS is `index-*`; lazy example chunks are excluded (loaded on demand).
  if (f.startsWith('index-') && f.endsWith('.js')) js += gzipKb(`${DIR}/${f}`);
  // CSS is merged into one `style-*` file (cssCodeSplit: false); count it.
  else if ((f.startsWith('style-') || f.startsWith('index-')) && f.endsWith('.css')) css += gzipKb(`${DIR}/${f}`);
}

const rows = [
  ['JS ', js, BUDGET_KB.js],
  ['CSS', css, BUDGET_KB.css],
];

let failed = false;
console.log('bundle size (gzip)');
for (const [name, kb, budget] of rows) {
  const ok = kb <= budget;
  failed ||= !ok;
  const pct = Math.round((kb / budget) * 100);
  console.log(`  ${ok ? '✓' : '✗'} ${name}  ${kb.toFixed(2)} KB / ${budget} KB  (${pct}%)`);
}

if (failed) {
  console.error('\n✗ bundle budget exceeded');
  process.exit(1);
}
console.log('\n✓ within budget');
