// Smoke-test the built package from plain Node.js ESM (run after
// `pnpm package`): the framework-free entries load without a bundler. Node
// needs every relative import to carry its extension, which bundlers don't, so
// only this shows a missing one. The Svelte entries (bo-grid, bo-grid/ladder)
// import .svelte files and need a Svelte-aware bundler, so they aren't loaded
// here; their types are checked by scripts/wrapper-types/tsconfig.node.json.
const ENTRIES = {
  'bo-grid/realtime': ['createOrderBook', 'createTickStream', 'connectFeed'],
  'bo-grid/trading': ['roundToTick', 'fmtTradingPrice', 'resolveTone'],
};

let failed = false;
for (const [entry, names] of Object.entries(ENTRIES)) {
  try {
    const mod = await import(entry);
    const missing = names.filter((n) => typeof mod[n] !== 'function');
    if (missing.length) {
      console.error(`✗ smoke-node: ${entry} lacks ${missing.join(', ')}`);
      failed = true;
    }
  } catch (err) {
    console.error(`✗ smoke-node: import('${entry}') failed: ${err.code ?? ''} ${err.message}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log(`✓ smoke-node: ${Object.keys(ENTRIES).join(' and ')} load in Node.js ESM`);
