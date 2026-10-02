# Benchmarks

bo-grid is built around two claims: **tiny** and **fast**. Both are measurable,
and both are enforced or reproducible from this repo — no hand-waving.

## Bundle size

What a consumer actually ships (gzipped, Svelte treated as a peer dependency and
excluded — you already ship the Svelte runtime):

| Asset | gzip |
| --- | --- |
| `bo-grid` core JS | **~40 KB** |
| `bo-grid` CSS | **~4 KB** |
| `bo-grid/realtime` (optional) | **~1 KB** |
| `bo-grid/trading` (optional) | **~1 KB** |

This is an order of magnitude smaller than typical heavyweight data grids, whose
core bundles run into the hundreds of KB before features. A few notes:

- The number is the **whole public API** measured eagerly. A consumer who imports
  only what they use (e.g. `import { Grid }`) tree-shakes the rest — the package is
  `sideEffects: false` — so the IO/print helpers don't ship unless imported.
- The **realtime tick pipeline** (`bo-grid/realtime`) and the **trading
  conventions** helpers (`bo-grid/trading`) are separate entries; none adds anything to the grid
  unless you import it.
- **Excel export** is a **dynamic import** of the optional `xlsx` peer — it never
  lands in the core bundle unless you call `exportXLSX`.
- The heavy menu UI (filter menu, columns panel) lazy-loads on first use and is
  excluded from the core number above.

`pnpm size:lib` reports these numbers in CI on every run, so a change that
moves them is visible in review; it fails only on an accidental blow-up (a
dependency bundled into an entry by mistake), not on feature growth.

```sh
pnpm size:lib   # measures the published library bundle
```


## Browser: a busy price board

The **Price board** demo is a VN-style bảng giá — 1,000 symbols, 24 columns
(three bid/ask levels, match, high/low, foreign flow), every changed cell
flashing, prices coloured by ceiling/floor/reference, ~30 rows on screen. Its
**Benchmark** button (or `window.__priceBoard.bench()` / `.benchScroll()`) runs
deterministic frames, each rendered synchronously: apply the frame's ticks,
`flushSync()`, then force style + layout. Paint and compositing are excluded.

Production build, Chrome on a Windows desktop:

| Workload | Frame p50 | p95 | Frames over 16.7 ms |
| --- | --- | --- | --- |
| 10,000 events/s, `patchRows` | ~1.9 ms | ~4.8 ms | 0 / 200 |
| 30,000 events/s, `patchRows` | ~4.5 ms | ~11 ms | 1 / 200 |
| 30,000 events/s, `$state` rows | ~5.3 ms | ~12 ms | 4 / 200 |
| Scroll 1 row / frame | ~1.0 ms | ~1.9 ms | 0 / 120 |
| Scroll 3 rows / frame | ~2.5 ms | ~5.7 ms | 0 / 120 |
| Scroll 10 rows / frame | ~8 ms | ~17 ms | 6 / 120 |

Board height scales the tick cost with the rows on screen (one session, so
comparable with each other but not with the table above):

| Rows on screen | 10,000 events/s p50 | 30,000 events/s p50 |
| --- | --- | --- |
| 31 (620 px) | ~3 ms | ~8 ms |
| 52 (1,400 px) | ~5 ms | ~14 ms |
| 80 (2,400 px) | ~7.6 ms | ~22 ms |

A sorted "top movers" board re-sorted with `api.refresh()` once a second pays
one heavier frame per refresh (in a slower session: ~42 ms at 1,000–1,600
symbols, down from ~65–70 ms before sort keys were read once per row), with
ordinary frames unchanged at a few ms.

At 30,000 events/s a frame applies ~500 coalesced ticks. The split is roughly
0.6 ms writing rows (`patchRows`; 1.6 ms through `$state` proxies), 2 ms for
Svelte to update the cells, and 1.8 ms of browser style + layout. Rows off screen
cost nothing beyond the write. Numbers move with the machine — compare runs on
the same machine, in the same session.

### Live frames: where the time goes

The synchronous benches above stop at layout. `window.__priceBoard.benchLive()`
runs the real pipeline in real time — the feed, the coalescing tick stream,
running flash animations — and times each frame from its start to a task posted
after it rendered, so paint is included. It needs a visible tab (hidden tabs get
no animation frames); a traced headless Chrome run gives the same numbers plus a
main-thread breakdown.

Headless Chrome on an Intel UHD laptop GPU, the 620 px board on screen with
the rest of the page hidden; each figure is the median of 5–12 interleaved,
traced rounds. Renderer main thread per frame:

| Step | 10,000 events/s | 30,000 events/s |
| --- | --- | --- |
| Script (tick stream, `patchRows`, Svelte) | ~1.5 ms | ~3.7 ms |
| Paint (recording the changed cells) | ~2.0 ms | ~3.3 ms |
| Layout + style + pre-paint | ~1.3 ms | ~2.6 ms |
| Layerize (grouping paint into layers) | ~0.65 ms | ~0.8 ms |
| **All main-thread tasks** | **~6 ms** | **~11.4 ms** |

Both rates fit a 16.7 ms frame with room to spare; frames dropped in a 3 s run
are in the single digits at 30,000 events/s.

What changed it, and what did not:

- **Value-only cells drop their own clip.** A cell that renders nothing but its
  value span used to clip twice — the cell and the span. The span already
  clips and ellipsizes inside the cell, so the cell's clip was redundant;
  without it, Layerize fell from ~0.98 to ~0.65 ms at 10,000 events/s and from
  ~1.05 to ~0.81 ms at 30,000, and all main-thread work by ~15% at 10,000.
  Output is identical (no value spills its cell; long values still end in …).
  Cells with structured content (badges, links, sparklines, renderers, editors)
  keep their clip.
- **Flash style: no effect.** A fading flash, a stepped one (tint on, then off)
  and no flash measured the same (~8 / 7.4 / 9 ms at 10,000 events/s,
  ~12.8 / 12.8 / 13.3 ms at 30,000). On a busy board a cell's text changes
  every frame or two, so it repaints whether or not it is flashing.
- **An opacity overlay instead of the background fade: ~9× slower** (73–82 ms
  a frame, 36–39 ms of it in Layerize). Every animating cell becomes a
  compositor layer.
- **Pinned columns cost a layer per row.** 31 of the board's 38 compositor
  layers are its pinned cells: each sticky cell has its own scroll-dependent
  position. Without sticky the frame is ~1 ms cheaper at 30,000 events/s;
  keeping pinning at one layer needs a pinned-column container — a future
  step. Removing `position: relative` from cells made paint slower (it lets
  Chrome reuse an unchanged cell's paint), so that stays.

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
| `TradeTape.push()` (time & sales) | 1,000,000 trades → 500-cap ring buffer | ~9 ms |
| `TradeTape.toArray()` (tape snapshot) | 10,000 snapshots of a full 500-trade tape | ~14 ms |

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
be, and is, negligible. `TradeTape` appends at **~88M trades/sec** (a true ring
buffer — O(1) regardless of how long the session runs) and snapshots a full
500-trade tape in ~1.4 µs, call it once per render rather than per trade.

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
pnpm size:lib    # bundle size report
pnpm dev         # demo with the 1M-row Big data example + FPS meter
```
