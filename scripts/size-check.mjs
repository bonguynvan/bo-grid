// Size report for the DEMO app's entry chunk (Svelte runtime + landing page +
// default example + library + demo data). Reported every run; the ceiling only
// catches accidental bloat (a lazy chunk or heavy dependency pulled into the
// entry), not feature growth. The shipped-library number lives in size:lib.
//
// Measures the CORE entry chunk only (the `index-*` files). Lazy chunks loaded
// via dynamic import (e.g. SheetJS for xlsx export) are intentionally excluded —
// they never load unless that feature is used, so they shouldn't count.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const DIR = 'demo-dist/assets';
const CEILING_KB = { js: 120, css: 20 }; // gzipped

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
  ['JS ', js, CEILING_KB.js],
  ['CSS', css, CEILING_KB.css],
];

let failed = false;
console.log('bundle size (gzip)');
for (const [name, kb, ceiling] of rows) {
  const ok = kb <= ceiling;
  failed ||= !ok;
  console.log(`  ${ok ? '✓' : '✗'} ${name}  ${kb.toFixed(2)} KB  (regression ceiling ${ceiling} KB)`);
}

if (failed) {
  console.error('\n✗ demo entry blew past its regression ceiling — a lazy chunk pulled in by accident?');
  process.exit(1);
}
console.log('\n✓ no size regression');
