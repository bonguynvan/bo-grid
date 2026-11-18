// svelte-package writes a component's types to `X.svelte.d.ts` and keeps the
// import `./X.svelte` in the declarations that use it. Under TypeScript's
// node16/nodenext resolution that import looks for `X.d.svelte.ts` instead, so
// it doesn't resolve and every component type (Grid, GridProps, …) turns into
// `any`. Point the declarations at `./X.svelte.js`, which every resolution
// mode maps to `X.svelte.d.ts`. Only the .d.ts files change; the .js files
// keep importing `./X.svelte`, which is what bundlers load.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SVELTE_IMPORT = /(\bfrom\s*|\bimport\s*\(\s*)(['"])(\.\.?\/[^'"]*\.svelte)\2/g;

let files = 0;
let imports = 0;
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry.endsWith('.d.ts')) {
      const src = readFileSync(p, 'utf8');
      const out = src.replace(SVELTE_IMPORT, (_, lead, q, spec) => {
        imports++;
        return `${lead}${q}${spec}.js${q}`;
      });
      if (out !== src) {
        writeFileSync(p, out);
        files++;
      }
    }
  }
}
walk('dist');
console.log(`dts-svelte-imports: pointed ${imports} component import(s) in ${files} declaration file(s) at .svelte.js`);
