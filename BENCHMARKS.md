# Benchmarks

bo-grid is built around two claims: **tiny** and **fast**. Both are measurable,
and both are enforced or reproducible from this repo — no hand-waving.

## Bundle size

What a consumer actually ships (gzipped, Svelte treated as a peer dependency and
excluded — you already ship the Svelte runtime):

| Asset | gzip |
| --- | --- |
| `bo-grid` JS | **~20 KB** |
| `bo-grid` CSS | **~2.7 KB** |

This is an order of magnitude smaller than typical enterprise data grids, whose
core bundles run into the hundreds of KB before features. Excel/CSV export is the
only heavy dependency, and it is a **dynamic import** of an optional `xlsx` peer —
it never lands in the core bundle unless you call `exportXLSX`.

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
| Build variable-height model | 1,000,000 rows → prefix sums | ~4 ms |
| `indexAt()` lookups (variable, binary search) | 1,000,000 lookups | ~77 ms (**~77 ns each**) |
| `indexAt()` lookups (uniform, O(1)) | 1,000,000 lookups | ~3 ms |
| `aggregate()` (sum/avg/count/min/max) | 1,000,000 numbers | ~7 ms |
| Multi-key sort (`compareBySorts`) | 100,000 rows × 2 keys | ~56 ms |
| `buildTreeRows()` (pre-order DFS) | 61,000 nodes | ~3 ms |

The headline: **~77 ns to locate the first visible row at any scroll position in
a million-row variable-height dataset.** A 60 fps frame budget is 16.7 ms, so that
lookup is roughly 0.0005% of a frame — virtualization cost is effectively free,
and it's flat as the dataset grows.

```sh
pnpm bench   # runs the hot-path benchmarks above
```

### What this does and doesn't measure

These isolate the grid's **core algorithms** — the work bo-grid does on every
scroll/sort/group, independent of your app. They are not a full in-browser
frame-rate benchmark: real scroll FPS also depends on your cell renderers, the
browser, and the device. The point is that bo-grid's own overhead stays negligible
as the dataset scales, which is the prerequisite for smoothness. To see live
in-browser FPS, run the demo (`pnpm dev`) and open the **Big data** example
(1,000,000 synthetic rows) — it has an on-screen FPS meter.

## Reproduce everything

```sh
pnpm install
pnpm bench       # hot-path timings
pnpm size:lib    # bundle size vs budget
pnpm dev         # demo with the 1M-row Big data example + FPS meter
```
