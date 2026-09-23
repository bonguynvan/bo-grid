<!--
  Paste this section into your project's CLAUDE.md (or AGENTS.md) so Claude
  Code / any agent that reads it generates correct bo-grid code from the
  start. Works as-is; trim if you don't use a given subpath.
-->

## bo-grid (Svelte 5 data grid)

This project depends on `bo-grid` (peer `svelte@^5`). Before writing or
editing bo-grid code, fetch and read
`https://bonguynvan.github.io/bo-grid/llms-full.txt` for the complete,
accurate API (every `ColumnDef`/`<Grid>` prop, every subpath export) — do not
guess a prop name or invent a plausible-sounding one.

**Four separate entry points** — importing one adds nothing to the others,
and each export lives in exactly one place:
- `bo-grid` — the `Grid` component + core types/helpers.
- `bo-grid/charts` — SVG charts (`LineChart`, `BarChart`, `DonutChart`, `StackedBarChart`, `CandlestickChart`, `DepthChart`, `Legend`).
- `bo-grid/realtime` — `createTickStream`, `TradeTape`, `centeredWindow`, `applyPatches` (feed pipeline).
- `bo-grid/trading` — `resolveTone`, `vnBands`, `fmtTradingPrice`, `sessionStateAt` (VN/APAC market conventions).
- `bo-grid/element` — the `<bo-grid>` web component (React/Vue/Angular/vanilla).

**Minimal usage**:
```svelte
<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from 'bo-grid';
  const columns: ColumnDef[] = [
    { type: 'text', key: 'symbol', header: 'Symbol', width: 120 },
    { type: 'price', key: 'price', header: 'Price', width: 90, flash: 'auto' },
  ];
  let rows: GridRow[] = $state([{ id: 1, symbol: 'AAPL', price: 227.5 }]); // GridRow needs only `id`
</script>
<Grid {rows} {columns} height={640} />
```

**Realtime cell flash — always `flash: 'auto'`, never hand-roll it:**
```ts
{ type: 'price', key: 'price', flash: 'auto' }   // column
row.price = next;                                 // the whole update
```
Do **not** generate `row.flashSeq++`/`row.flashDir = ...` bookkeeping for a
new column — that's the legacy `flash: true` pattern, only needed if the row-
driven mode is explicitly requested. `GridRow.flashSeq`/`flashDir` are
optional and unnecessary otherwise.

**Custom cells**: a Svelte `cell` snippet in Svelte code; a column's
`render(ctx) => Node | string` function from React/Vue/vanilla/`<bo-grid>`
(snippets don't exist outside Svelte).

**Before generating non-trivial code** (new column types, a realtime feed, a
chart, the web component), check `llms-full.txt` above rather than
extrapolating from this summary — it has the full, current prop lists.
