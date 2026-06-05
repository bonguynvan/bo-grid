# bo-grid

Tiny, fast **Svelte 5** data grid for fintech UIs — canvas sparklines, batched
realtime cell updates, and virtual scrolling in a package that gzips to a few KB.
A free alternative to the heavyweight grids that paywall these features.

**[Live demo](https://bonguynvan.github.io/bo-grid/)** ·
**[API reference](https://bonguynvan.github.io/bo-grid/api.html)**

> **Status: v0.1 (early).** Working: config-driven columns, virtual scroll,
> client sort + filter, multi-cell selection + live range aggregation, row
> grouping (nested, collapsible, sticky headers, live subtotals), a server-side
> `RowSource` for huge datasets, CSV/Excel export, drag-to-reorder columns,
> pinned columns, inline cell editing, sparklines, realtime flash, heatmaps. Unit
> tests (Vitest), type-check, a headless mount smoke-test, and library + demo
> bundle-size budgets all run in CI. Feature-complete for v0; a formal WCAG audit
> is the main thing left — see the roadmap.

## Why

| | Heavy enterprise grids | bo-grid |
| --- | --- | --- |
| Price | $$$ / dev / year | Free (MIT) |
| Sparklines | paid tier | built in |
| Realtime cell updates | DIY / complex | built-in primitive |
| Bundle | ~500 KB | a few KB gzip |
| Svelte | wrapper | native Svelte 5 |

## Install

```sh
npm i bo-grid
# peer dependency: svelte@^5
```

## Usage

```svelte
<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from 'bo-grid';

  const columns: ColumnDef[] = [
    { type: 'text',      key: 'symbol', sub: 'sector', header: 'Symbol', width: 132 },
    { type: 'price',     key: 'price',  header: 'Price', width: 88, flash: true },
    { type: 'percent',   key: 'changePct', header: 'Chg %', width: 84 },
    { type: 'heatmap',   key: 'changePct', header: 'Heat', min: -5, max: 5, width: 76 },
    { type: 'volume',    key: 'volume', header: 'Volume', width: 90 },
    { type: 'date',      key: 'listedAt', header: 'Listed', dateStyle: 'short', width: 92 },
    { type: 'sparkline', key: 'candles', sparkKey: 'candles', header: 'Trend', flex: 1 },
  ];

  // Rows must expose `id`, `flashSeq`, `flashDir` plus your data fields.
  // Make the hot fields `$state` so updates flash without re-rendering the table.
  let rows: GridRow[] = $state(/* ... */);
  let filter = $state(''); // bind to your own search input
</script>

<Grid {rows} {columns} {filter} height={640} />
```

### Realtime updates

A cell with `flash: true` plays a brief amber flash whenever the row's
`flashSeq` increments. Drive it from your data source (e.g. a WebSocket):

```ts
row.flashDir = next >= row.price ? 'up' : 'down';
row.price = next;
row.flashSeq++; // triggers the flash on the price cell
```

Only on-screen rows render DOM, so off-screen updates cost nothing until they
scroll into view. Batch bursty feeds into a `requestAnimationFrame` flush to
keep frames smooth.

## Column types

`text` · `price` · `percent` · `volume` · `number` · `date` · `heatmap` · `sparkline` · `custom`

Sizing: `width` (px) or `flex` (grow weight). See `ColumnDef` for per-type options.

### Custom cells

Use `type: 'custom'` and pass a `cell` snippet to render anything — badges,
buttons, links. The snippet receives `{ row, column, value }`:

```svelte
{#snippet cell({ row })}
  <span class:up={row.changePct > 0}>{row.changePct > 0 ? '▲' : '▼'}</span>
{/snippet}

<Grid {rows} {columns} {cell} height={640} />
```

## Row height

Uniform 36px by default. Pass `rowHeight` as a number for a different density, or
a function for variable per-row heights (in-memory mode):

```svelte
<Grid {rows} {columns} rowHeight={48} height={640} />
<Grid {rows} {columns} rowHeight={(row, i) => (row.expanded ? 96 : 36)} height={640} />
```

Variable heights use a prefix-sum + binary-search virtualizer, so scrolling stays
O(log n). Source mode is uniform-only (unloaded row heights aren't known).

## Sort & filter

Click a column header to sort (asc → desc → off). Sparkline columns aren't
sortable; set `sortable: false` on any column to opt out. Sorting is a snapshot —
rows hold position while their values update in place (trading-grid behaviour),
so a realtime feed never reshuffles the view.

Pass a `filter` string to quick-filter rows (matches across column values). Drive
it from your own search input — the grid stays presentation-only.

## Selection & aggregation

Click a cell, then drag or **Shift-click** to extend a rectangular selection.
Keyboard: **arrows** move, **Shift+arrows** extend, **Ctrl/⌘+A** select all,
**Ctrl/⌘+C** copy the selection as TSV (Excel-pasteable), **Esc** clear.

When more than one cell is selected, a footer bar shows live **Sum / Avg / Count /
Min / Max** over the numeric cells in the range — and it keeps updating as a
realtime feed ticks. Choose which stats to show:

```svelte
<Grid {rows} {columns} aggregations={['sum', 'avg', 'count']} height={640} />
```

## Grouping

Pass `groupBy` (column keys) to group rows — single or nested. Groups are
collapsible (click the header) and show **live subtotals** under any column with
a `groupAgg` set:

```svelte
<script>
  const columns = [
    { type: 'price',  key: 'price',  header: 'Price',  groupAgg: 'avg' },
    { type: 'volume', key: 'volume', header: 'Volume', groupAgg: 'sum' },
    // …
  ];
</script>

<Grid {rows} {columns} groupBy={['sector', 'exchange']} height={640} />
```

Group headers are the same height as data rows, so virtual scrolling stays smooth
over very large grouped sets. Subtotals recompute live as the feed ticks, and the
current group's header stays pinned to the top as you scroll within it.

## Theming

Dark-first and self-contained — no CSS import required. Use the `theme` prop with
a built-in preset or a custom token map:

```svelte
<Grid {rows} {columns} theme="light" height={640} />
<Grid {rows} {columns} theme={{ bg: '#0b1020', up: '#22d3ee' }} height={640} />
```

Built-in `darkTheme` / `lightTheme` are exported (`GridTheme`). Or set any
`--bo-grid-*` custom property on an ancestor — the prop is just a convenience over
these:

```css
.my-app {
  --bo-grid-bg: #fff;
  --bo-grid-text: #1a1a1a;
  --bo-grid-up: #16a34a;
  --bo-grid-down: #dc2626;
}
```

## Server-side / large datasets

Instead of an in-memory `rows` array, back the grid with a **`RowSource`** — the
grid requests only the visible window (plus overscan), so the dataset can be far
larger than memory. Sort and filter are delegated to the source; unloaded rows
render as skeletons.

```svelte
<script lang="ts">
  import { Grid, createArraySource, type RowSource } from 'bo-grid';

  // Your own source: fetch a window from the server.
  const source: RowSource = {
    async getRows({ range, sort, filter }) {
      const res = await fetch(`/api/rows?offset=${range.start}&limit=${range.end - range.start}` +
        `&sort=${sort?.key ?? ''}&dir=${sort?.dir ?? ''}&q=${filter}`);
      return res.json(); // { rows, total }
    },
  };
</script>

<Grid {columns} {source} height={640} />
```

`createArraySource(rows, { latency, filterKeys })` adapts an in-memory array to
the same interface (handy for testing the path or client-side data). Grouping is
client-only, so it's not applied in source mode.

## Column reorder

Drag any column header to reorder columns. Pass `persistKey` to remember the
user's order across reloads (saved to `localStorage`):

```svelte
<Grid {rows} {columns} persistKey="watchlist" height={640} />
```

## Inline editing

Mark a column `editable: true`. Double-click a cell (or press <kbd>Enter</kbd> on
the focused cell) to edit; <kbd>Enter</kbd>/blur commits, <kbd>Esc</kbd> cancels.
The grid is controlled, so it reports the change via `onCellEdit` — update your
own row data there:

```svelte
<Grid
  {rows}
  {columns}
  height={640}
  onCellEdit={(e) => (e.row[e.column.key] = e.value)}
/>
```

`e.value` is parsed to a number for numeric columns (invalid input is rejected),
otherwise the raw string. Make the edited field `$state` so the cell updates.

## Pinned columns

Set `pinned: true` on a column to keep it visible while the rest scroll
horizontally. This is opt-in: with no pinned columns the grid stays fit-to-width
(no horizontal scroll). Pinned columns move to the left edge and stick there.

```ts
const columns = [
  { type: 'text',  key: 'symbol', header: 'Symbol', width: 132, pinned: true },
  { type: 'price', key: 'price',  header: 'Price',  width: 88,  pinned: true },
  // …wider columns scroll under the pinned ones
];
```

## Export

CSV export is dependency-free:

```ts
import { exportCSV, toCSV } from 'bo-grid';

exportCSV('tickers.csv', rows, columns);          // triggers a download
const text = toCSV(rows, columns, { formatted: true }); // or get the string
```

Excel export loads SheetJS via **dynamic import**, so it lands in its own lazy
chunk and never bloats your core bundle. `xlsx` is an **optional peer dependency**
— install it only if you use this:

```ts
import { exportXLSX } from 'bo-grid';
await exportXLSX('tickers.xlsx', rows, columns); // npm i xlsx
```

Sparkline columns are skipped; numeric columns export as raw numbers so
spreadsheets can compute on them (pass `{ formatted: true }` for display strings).
Ctrl/⌘+C still copies the current selection as TSV.

## Also exported

`Sparkline` component · `drawCandles` / `setupHiDpiCanvas` (draw on your own
canvas) · `fmtPrice` / `fmtPercent` / `fmtVolume` / `fmtDate` · `heatColor` ·
`Selection` · `aggregate` · `toCSV` / `exportCSV` / `exportXLSX` / `rowsToMatrix`.

## Pivot tables

`pivot()` transforms flat rows into a pivot table (rows + dynamic columns) you
hand straight to `<Grid>` — group by row fields, spread a field's values into
columns, and aggregate a measure into each cell:

```svelte
<script lang="ts">
  import { Grid, pivot } from 'bo-grid';

  const { rows: pivotRows, columns: pivotColumns } = pivot(data, {
    rowFields: ['sector'],     // → leading text columns
    columnField: 'exchange',   // distinct values → columns (+ a Total)
    measure: 'volume',
    agg: 'sum',
  });
</script>

<Grid rows={pivotRows} columns={pivotColumns} height={640} />
```

It's a pure function, so call it as a snapshot or reactively as you prefer.

## Accessibility

The grid follows the ARIA grid pattern. Because rows are virtualized, it exposes
the real dimensions and positions so assistive tech isn't misled:

- `role="grid"` with `aria-rowcount` / `aria-colcount` (full size, not the
  rendered window) and `aria-multiselectable`.
- `role="row"` + `aria-rowindex` on rows, `role="gridcell"` + `aria-colindex` +
  `aria-selected` on cells, `role="columnheader"` + `aria-sort` on headers.
- `aria-activedescendant` tracks the focused cell for screen readers.
- Sparkline cells carry a text `aria-label`; sticky/skeleton duplicates are
  `aria-hidden`; the aggregation bar is an `aria-live` status region.
- Fully keyboard-operable (see [Selection & keyboard](#selection--keyboard) and
  inline editing) and respects `prefers-reduced-motion`.

A formal WCAG 2.1 AA audit is on the roadmap; the above is a deliberate pass, not
a certification.

## Develop

```sh
pnpm install
pnpm dev       # demo/playground at http://localhost:5180
pnpm test      # unit tests (Vitest)
pnpm check     # type-check
pnpm smoke     # headless mount + interaction smoke test
pnpm size      # bundle-size budget
pnpm package   # build the publishable library into dist/
```

## Roadmap

Formal WCAG 2.1 AA audit → multi-measure pivots → more themes. Contributions
welcome.

## License

MIT
