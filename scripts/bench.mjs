// Hot-path benchmarks backing the "tiny + fast" claim with real numbers.
//
// The differentiator is virtualization: the grid positions any row and finds the
// first visible row in O(1) (uniform) or O(log n) (variable height) — so scroll
// stays smooth whether the dataset is 1k rows or 1M. These measure that core plus
// the other per-dataset hot paths (aggregate, multi-key sort, tree flatten).
//
// Standalone Vite SSR (like ssr.mjs / smoke.mjs) so it can load the TS modules.
// Deterministic inputs (no Math.random) so runs are comparable. Node, single
// thread. Run: pnpm bench
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

const server = await createServer({
  configFile: false,
  plugins: [svelte()],
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

const fmt = (n) => n.toLocaleString('en-US');
const ms = (n) => `${n.toFixed(2)} ms`;
const results = [];
function time(label, detail, fn) {
  const t0 = performance.now();
  const out = fn();
  const t1 = performance.now();
  results.push({ label, detail, t: t1 - t0 });
  return out;
}

try {
  const { uniformHeights, variableHeights } = await server.ssrLoadModule(
    '/src/lib/grid/rowheight.ts',
  );
  const { aggregate } = await server.ssrLoadModule('/src/lib/grid/aggregate.ts');
  const { compareBySorts } = await server.ssrLoadModule('/src/lib/grid/column.ts');
  const { buildTreeRows } = await server.ssrLoadModule('/src/lib/grid/tree.ts');

  const N = 1_000_000;

  // --- Virtual scroll: variable row heights (prefix sums + binary search) ---
  const heights = new Array(N);
  for (let i = 0; i < N; i++) heights[i] = 28 + (i % 5) * 8;
  let vModel;
  time('build variable-height model', `${fmt(N)} rows → Float64 prefix sums`, () => {
    vModel = variableHeights(heights);
  });
  const LOOKUPS = 1_000_000;
  time('variable indexAt() lookups', `${fmt(LOOKUPS)} × binary search O(log n)`, () => {
    let acc = 0;
    const total = vModel.total;
    for (let i = 0; i < LOOKUPS; i++) acc += vModel.indexAt((i * 6151) % total);
    if (acc < 0) throw new Error('unreachable');
  });

  // --- Virtual scroll: uniform row heights (O(1)) ---
  const uModel = uniformHeights(N, 36);
  time('uniform indexAt() lookups', `${fmt(N)} × O(1)`, () => {
    let acc = 0;
    for (let i = 0; i < N; i++) acc += uModel.indexAt(i * 36);
    if (acc < 0) throw new Error('unreachable');
  });

  // --- Range aggregation over a full column ---
  const vals = new Array(N);
  for (let i = 0; i < N; i++) vals[i] = ((i * 7) % 1000) / 3;
  time('aggregate()', `sum/avg/count/min/max over ${fmt(N)} numbers`, () => aggregate(vals));

  // --- Multi-key sort ---
  const M = 100_000;
  const rows = new Array(M);
  for (let i = 0; i < M; i++) rows[i] = { id: i, sector: `S${i % 20}`, px: (i * 13) % 1000 };
  const sorts = [
    { key: 'sector', dir: 'asc' },
    { key: 'px', dir: 'desc' },
  ];
  time('multi-key sort', `${fmt(M)} rows by 2 keys (compareBySorts)`, () => {
    rows.sort((a, b) => compareBySorts(a, b, sorts));
  });

  // --- Tree flatten (pre-order DFS) ---
  const roots = [];
  for (let r = 0; r < 1000; r++) {
    const kids = [];
    for (let c = 0; c < 10; c++) {
      const gk = [];
      for (let g = 0; g < 5; g++) gk.push({ id: `${r}.${c}.${g}` });
      kids.push({ id: `${r}.${c}`, children: gk });
    }
    roots.push({ id: `${r}`, children: kids });
  }
  const NODES = 1000 * (1 + 10 * (1 + 5)); // 61,000
  let flat;
  time('buildTreeRows()', `${fmt(NODES)} nodes, all expanded`, () => {
    flat = buildTreeRows(roots, (row) => row.children ?? [], () => true);
  });

  // --- Report ---
  const wLabel = Math.max(...results.map((r) => r.label.length));
  console.log('\nbo-grid hot-path benchmarks — Node, single thread, deterministic inputs\n');
  for (const { label, detail, t } of results) {
    console.log(`  ${ms(t).padStart(10)}   ${label.padEnd(wLabel)}  ${detail}`);
  }
  const vLookup = results.find((r) => r.label === 'variable indexAt() lookups');
  const perLookupNs = (vLookup.t * 1e6) / LOOKUPS;
  console.log(
    `\n  → ${perLookupNs.toFixed(0)} ns per variable-height row lookup ` +
      `(the per-frame cost of finding the first visible row at any scroll position).`,
  );
  console.log(`  → tree rows flattened: ${fmt(flat.length)}\n`);
} finally {
  await server.close();
}
