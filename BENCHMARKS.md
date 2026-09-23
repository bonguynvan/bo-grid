# Benchmarks

bo-grid is built around two claims: **tiny** and **fast**. Both are measurable,
and both are enforced or reproducible from this repo — no hand-waving.

## Bundle size

What a consumer actually ships (gzipped, Svelte treated as a peer dependency and
excluded — you already ship the Svelte runtime):

| Asset | gzip |
| --- | --- |
| `bo-grid` core JS | **~33 KB** |
| `bo-grid` CSS | **~4 KB** |
| `bo-grid/charts` (optional) | **~3 KB** |
| `bo-grid/realtime` (optional) | **~1 KB** |
| `bo-grid/trading` (optional) | **~1 KB** |

This is an order of magnitude smaller than typical heavyweight data grids, whose
core bundles run into the hundreds of KB before features. A few notes:

- The number is the **whole public API** measured eagerly. A consumer who imports
  only what they use (e.g. `import { Grid }`) tree-shakes the rest — the package is
  `sideEffects: false` — so the IO/print helpers don't ship unless imported.
- The **charts companion** (`bo-grid/charts`), the **realtime tick pipeline**
  (`bo-grid/realtime`) and the **trading conventions** helpers (`bo-grid/trading`)
  are separate entries on their own budgets; none adds anything to the grid
  unless you import it.
- **Excel export** is a **dynamic import** of the optional `xlsx` peer — it never
  lands in the core bundle unless you call `exportXLSX`.
- The heavy menu UI (filter menu, columns panel) lazy-loads on first use and is
  excluded from the core number above.

The size is a CI gate: `pnpm size:lib` fails the build if JS or CSS exceeds the
budget, so it can't silently regress.

```sh
pnpm size:lib   # measures the published library bundle against its budget
```

## Hot paths

The reason scrolling stays smooth whether you have 1,000 rows or 1,000,000 is
**virtualization**: only on-screen rows render, and the grid finds the first
visible row and positions any row in **O(1)** (uniform height) or **O(log n)**
(variable height, via prefix sums + binary search). Row count barely affects the
per-frame cost.

`pnpm bench` measures these directly. Representative run (Node, single thread,
deterministic inputs — absolute numbers vary by machine, the orders of magnitude
don't):

| Operation | Scale | Time |
| --- | --- | --- |
| Build variable-height model | 1,000,000 rows → prefix sums | ~3 ms |
| `indexAt()` lookups (variable, binary search) | 1,000,000 lookups | ~79 ms (**~79 ns each**) |
| `indexAt()` lookups (uniform, O(1)) | 1,000,000 lookups | ~3 ms |
| `aggregate()` (sum/avg/count/min/max) | 1,000,000 numbers | ~9 ms |
| Multi-key sort (`compareBySorts`) | 100,000 rows × 2 keys | ~52 ms |
| `buildTreeRows()` (pre-order DFS) | 61,000 nodes | ~5 ms |
| `TickBuffer.push()` (coalesce) | 1,000,000 ticks → 5,000 symbols | ~54 ms |
| `applyPatches()` (keyed row writes) | 200 frames × 5,000 rows | ~42 ms |
| `FlashTracker.observe()` (derived flash) | 1,000,000 cell observations | ~52 ms |

The headline: **~79 ns to locate the first visible row at any scroll position in
a million-row variable-height dataset.** A 60 fps frame budget is 16.7 ms, so that
lookup is roughly 0.0005% of a frame — virtualization cost is effectively free,
and it's flat as the dataset grows.

For realtime, the headline is **~18M ticks/sec ingested and coalesced**, and
**~0.21 ms to apply a 5,000-row frame**. That's the point of the two-stage
pipeline: a million raw messages collapse into 5,000 pending writes, so the frame
pays for what changed, not for what arrived. The default `cap` of 400 rows per
frame keeps a burst well inside the 16.7 ms budget. Derived per-cell flash costs
~52 ns per rendered cell per update — it runs on every visible cell, so it has to
be, and is, negligible.

```sh
pnpm bench   # runs the hot-path benchmarks above
```

### What this does and doesn't measure

These isolate the grid's **core algorithms** — the work bo-grid does on every
scroll/sort/group/tick, independent of your app. They are not a full in-browser
frame-rate benchmark: real scroll FPS also depends on your cell renderers, the
browser, and the device. The realtime rows measure the pipeline's own cost
(coalescing and keyed writes), not the framework's rendering of the cells those
writes dirty — for that, see the live meters below.

The point is that bo-grid's own overhead stays negligible as the dataset and the
tick rate scale, which is the prerequisite for smoothness. To see live
in-browser FPS, run the demo (`pnpm dev`) and open the **Big data** example
(1,000,000 synthetic rows) — it has an on-screen FPS meter. The **Trading desk**
example adds the realtime numbers next to it: frames per second, cell updates
applied per second, and the queue depth waiting for a frame. Turn the feed on and
watch all three at once — that's the measurement that matters for a live board,
on your hardware.

## Reproduce everything

```sh
pnpm install
pnpm bench       # hot-path timings
pnpm size:lib    # bundle size vs budget
pnpm dev         # demo with the 1M-row Big data example + FPS meter
```
