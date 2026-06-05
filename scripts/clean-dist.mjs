// svelte-package copies every file under src/lib, including co-located *.test.*
// files. Strip them from dist so they don't ship in the published package.
import { readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

let removed = 0;
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.test\.(js|d\.ts)$/.test(entry)) {
      rmSync(p);
      removed++;
    }
  }
}
walk('dist');
console.log(`clean-dist: removed ${removed} test file(s)`);
