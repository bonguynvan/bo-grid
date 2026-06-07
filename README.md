# bo-grid

Tiny, fast **Svelte 5** data grid for fintech UIs — canvas sparklines, batched
realtime cell updates, and virtual scrolling in a package that gzips to ~20 KB.
A free alternative to the heavyweight grids that paywall these features.

**[Live demo](https://bonguynvan.github.io/bo-grid/)** ·
**[API reference](https://bonguynvan.github.io/bo-grid/api.html)** ·
**[Benchmarks](./BENCHMARKS.md)** ·
**[Roadmap](./ROADMAP.md)**

The demo is a small gallery of nine grid types — a realtime **Trading desk**, a
grouped **Portfolio** with subtotals and pivot, a general-purpose editable
**Spreadsheet**, a live **Order book** depth ladder, a **Correlation** heatmap
matrix, a **Leaderboard** with rank medals and score bars, a **Tree** file
explorer, a drag-to-reorder **Tasks** list, and a **1M-row** trade tape windowed
from a synthetic source — switch between them with the tabs.

> **Status: actively developed.** Working: config-driven columns, virtual scroll,
> sort (single / multi / controlled), filtering (global, per-column row, header
> filter menus with set / number / date filters, quick search, controlled +
> server-side), multi-cell selection + live aggregation, grouping (nested, sticky,
> subtotals), pivot, tree data, master-detail, a server-side `RowSource` for huge
> datasets, CSV/Excel export, column management (reorder, resize, pin L/R, hide,
> autosize, tool panel, column menu), spreadsheet editing (inline + typed editors,
> validation, copy/paste, fill handle, undo/redo), row selection, pagination,
> sparklines, realtime flash, heatmaps, theming, and full keyboard a11y.
> **SSR/SvelteKit-safe.**
> Unit tests (Vitest), type-check, a headless mount smoke-test, an SSR render
> check, and library + demo bundle-size budgets all run in CI. A formal WCAG audit
> is the main thing left — see the roadmap.

## Why

| | Heavy enterprise grids | bo-grid |
| --- | --- | --- |
| Price | $$$ / dev / year | Free (MIT) |
| Sparklines | paid tier | built in |
| Realtime cell updates | DIY / complex | built-in primitive |
| Bundle | hundreds of KB | **~20 KB gzip** ([benchmarks](./BENCHMARKS.md)) |
| Svelte | wrapper | native Svelte 5 |

bo-grid ships most of AG Grid's **paid (Enterprise)** features — grouping, pivot,
tree data, master-detail, range selection, Excel export, sparklines — for free.
See the honest **[bo-grid vs AG Grid](./docs/vs-ag-grid.md)** comparison (including
what it doesn't do) to decide.

## Install

```sh
npm i bo-grid
# peer dependency: svelte@^5
```

Works with **SvelteKit / SSR** out of the box — `<Grid>` server-renders to HTML
without touching `window`/`document`/`localStorage` (a CI gate, `pnpm ssr`,
proves it). The package is `sideEffects: false`, so unused exports tree-shake
away. See the **[SvelteKit guide](./docs/sveltekit.md)** for `load`-function data,
realtime feeds, and layout persistence.

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

**Data:** `text` · `price` · `percent` · `volume` · `number` · `date` · `heatmap` ·
`sparkline`
**Rich:** `progress` · `rating` · `tags` · `badge` · `boolean` · `avatar`
**Escape hatch:** `custom`

Rich types render value as a widget — handy well beyond fintech (CRM, projects,
admin, content). All are themed from the design tokens:

```ts
const columns: ColumnDef[] = [
  { type: 'avatar',  key: 'name',   header: 'Member', sub: 'role' },
  { type: 'badge',   key: 'status', header: 'Status',
    tones: { Active: 'up', Away: 'amber', Offline: 'neutral' } },
  { type: 'progress', key: 'done',  header: 'Progress', min: 0, max: 100 },
  { type: 'rating',  key: 'score',  header: 'Rating', max: 5 },
  { type: 'tags',    key: 'skills', header: 'Skills' },        // value: string[]
  { type: 'boolean', key: 'remote', header: 'Remote', trueLabel: 'Remote', falseLabel: 'Office' },
];
```

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

## Conditional formatting

Paint analytics cues straight into numeric cells — no custom snippet needed.

**Data bars** (`dataBar`): an in-cell bar behind the value, scaled across the
column's range. The range auto-computes over the current view, or set `min`/`max`
(`min: 0` gives absolute proportional bars). When the range spans negatives, bars
diverge left/right around a zero baseline. `color`/`negative` override the default
up/down theme colours.

**Icon sets** (`icons`): an icon beside the value, chosen by the highest threshold
`at` that is ≤ the value. Each rule carries a semantic `tone` (`up` · `down` ·
`amber` · `info` · `neutral`) for its colour.

**Colour scales** (`colorScale`): tint the cell background across the value range —
a soft, themed heat ramp. Auto-ranges over the view (or set `min`/`max`); pass
`mid` for a 3-stop diverging scale; `colors` overrides the stops. Works on any
numeric column (the fixed `heatmap` type still exists for an absolute ramp).

```ts
const columns: ColumnDef[] = [
  // Proportional bar from zero:
  { type: 'volume', key: 'marketValue', header: 'Mkt Value', dataBar: { min: 0 } },
  // Diverging bar (auto-ranged) + an icon keyed by sign:
  { type: 'number', key: 'pnl', header: 'P&L', decimals: 0,
    dataBar: {},
    icons: [
      { at: -Infinity, icon: '▼', tone: 'down' },
      { at: 0,         icon: '▲', tone: 'up' },
    ] },
  // Diverging colour scale around zero (auto-ranged):
  { type: 'number', key: 'pnlPct', header: 'P&L %', decimals: 1, colorScale: { mid: 0 } },
];
```

All three compose with flashing/live cells and add nothing to the core for grids
that don't use them. (In-memory auto-ranging; pass explicit `min`/`max` in source
mode.)

## Row height

Uniform 36px by default. Pass `rowHeight` as a number for a different density, or
a function for variable per-row heights (in-memory mode):

```svelte
<Grid {rows} {columns} rowHeight={48} height={640} />
<Grid {rows} {columns} rowHeight={(row, i) => (row.expanded ? 96 : 36)} height={640} />
```

Variable heights use a prefix-sum + binary-search virtualizer, so scrolling stays
O(log n). Source mode is uniform-only (unloaded row heights aren't known).

## Pagination

Prefer pages over one long scroll? Set `pageSize` (> 0) for a paged view with a
first/prev/next/last pager; rows still virtualize within each page. In-memory mode.

```svelte
<Grid {rows} {columns} height={640} pageSize={25} />
```

## Sort & filter

Click a column header to sort (asc → desc → off). **Shift-click** additional
headers to sort by multiple columns — each sorted header shows its position in
the order. Sparkline columns aren't sortable; set `sortable: false` on any column
to opt out. Sorting is a snapshot — rows hold position while their values update
in place (trading-grid behaviour), so a realtime feed never reshuffles the view.

Pass a `filter` string to quick-filter rows (matches across column values). Drive
it from your own search input — or set `quickFilter` for a **built-in search box**
above the grid. Set `filterRow` to add a row of **per-column filter inputs** under
the header (rows must match every non-empty column filter; in-memory mode).

For richer filtering, set `filterMenu` to add a **funnel to each column header**.
Clicking it opens a menu whose control matches the column type — text
(contains / equals / starts / ends), number (`=, ≠, <, ≤, >, ≥, between`), or date
(before / after / on / between). Set `col.filter: 'set'` for a **set filter** — a
searchable checkbox list of the column's distinct values (All / None). The menu
is lazy-loaded on first open, so it costs nothing until used; disable it per
column with `col.filter: false`:

```svelte
<Grid {rows} {columns} height={640} filterMenu />
```

Filtering is uncontrolled by default. To **own the filter state** (persist it, set
initial filters, sync to the URL), pass a controlled `columnFilters` map and
handle `onFilterChange` — mirrors controlled `sort`. In **server (`source`) mode**
the filter menu still works: text/number/date filters are delegated to your
`RowSource` via `params.columnFilters` (set filters need in-memory data).

Sorting is uncontrolled by default. To own it (persist it, set an initial sort,
or sync to the URL), pass a controlled `sort` array and handle `onSortChange`:

```svelte
<Grid {rows} {columns} height={640} {sort} onSortChange={(s) => (sort = s)} />
```

## Selection & aggregation

Click a cell, then drag or **Shift-click** to extend a rectangular selection.
Keyboard: **arrows** move, **Shift+arrows** extend, **Home/End** jump to the
first/last column (**+Ctrl/⌘** for the first/last cell), **PageUp/PageDown** move
by a page, **Ctrl/⌘+A** select all, **Ctrl/⌘+C** copy the selection as TSV
(Excel-pasteable), **Ctrl/⌘+V** paste, **Esc** clear.

Paste writes a TSV block (from a spreadsheet or the grid's own copy) into
editable cells starting at the selection's top-left. A single copied value fills
the whole selection (Excel behaviour); a block clamps to the grid edges. Pasted
values flow through the same validation as inline editing — non-editable columns
and invalid numbers are skipped — and each accepted cell emits `onCellEdit`, so
paste only does anything when you've wired that callback.

Set `fillHandle` for an **Excel-style fill handle**: the selection grows a small
square at its bottom-right corner; drag it down or right to copy the selected
value(s) across the extended range (editable columns; multi-cell selections tile).

Edits, paste and fill are **undoable** with <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> (redo
with <kbd>Ctrl/⌘</kbd>+<kbd>Y</kbd>). A paste or fill undoes as a single step.

When more than one cell is selected, a footer bar shows live **Sum / Avg / Count /
Min / Max** over the numeric cells in the range — and it keeps updating as a
realtime feed ticks. Choose which stats to show:

```svelte
<Grid {rows} {columns} aggregations={['sum', 'avg', 'count']} height={640} />
```

Set `footer` for a **pinned totals row**: every column with a `groupAgg` shows
that aggregate over all (filtered) rows, sticky to the bottom as you scroll
(in-memory mode).

```svelte
<Grid {rows} {columns} height={640} footer />
```

Pass `pinnedRows` to keep rows stuck to the **top**, always visible above the
scroll — a benchmark, a summary, or "your position". They render with the normal
columns (and `rowClass`) but are display-only:

```svelte
<Grid {rows} {columns} height={640} pinnedRows={[benchmark]} />
```

## Row selection

Set `rowSelection` for a leading checkbox column — whole-row selection keyed by
`row.id`, so it survives sorting and filtering (unlike the positional cell
selection above). The header checkbox selects/clears all matching rows, and
<kbd>Space</kbd> toggles the focused row from the keyboard.
`onRowSelectionChange` reports the selected ids:

```svelte
<Grid
  {rows}
  {columns}
  height={640}
  rowSelection
  onRowSelectionChange={(ids) => (selected = ids)}
/>
```

In server (`source`) mode the per-row checkboxes work on loaded rows; the
select-all header checkbox is disabled (unloaded ids can't be enumerated).

Selection keys off `row.id` by default; pass `getRowId` for string/UUID/composite
keys (`getRowId={(r) => r.uuid}`).

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

Native form controls (checkboxes, date pickers, number spinners, search inputs,
scrollbars) follow the theme automatically via `color-scheme` + `accent-color`.
A custom theme defaults to dark; set `scheme: 'light'` (or `--bo-grid-scheme:
light`) for a light one.

**Tokens** cover colour, typography (`mono`/`sans`/`fontSize`), shape (`radius`),
and density (`cellPad`, plus the `rowHeight` prop) — so the whole look is yours.
Numeric columns use tabular figures so digits line up. A few looks:

```svelte
<!-- Compact / dense -->
<Grid {rows} {columns} rowHeight={28}
  theme={{ fontSize: '12px', cellPad: '6px' }} height={640} />

<!-- Roomy & rounded -->
<Grid {rows} {columns} rowHeight={44}
  theme={{ radius: '16px', cellPad: '16px', fontSize: '14px' }} height={640} />

<!-- Branded -->
<Grid {rows} {columns}
  theme={{ bg: '#0b1020', headerBg: '#0d1226', up: '#22d3ee', down: '#fb7185',
           selBorder: '#22d3ee', radius: '12px' }} height={640} />
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

Pass `onRowReorder(from, to)` to enable **drag-to-reorder rows** via a handle in
the first column — reorder your own `rows` array in the callback (flat, unsorted,
in-memory lists). Drag any column header to reorder columns; pass `persistKey` to
remember the user's order across reloads (saved to `localStorage`):

```svelte
<Grid {rows} {columns} persistKey="watchlist" height={640} />
```

## Column resize

Drag the grip on a header's right edge to resize a column; **double-click** the
grip to reset it to its default width. Resizing a fit-to-width (`flex`) column
pins it to the dragged width and lets its neighbours absorb the difference. The
same `persistKey` remembers widths across reloads.

Bound a column's draggable range with `minWidth` / `maxWidth`. Resizing is on by
default. Turn it off for the whole grid with `resizable={false}`, or per column
with `resizable: false` (handy for a fixed action column):

```svelte
<Grid {rows} {columns} resizable={false} height={640} />
```

## Column visibility

Pass `hiddenColumns` (column keys to hide) — controlled, like `filter`. Build
your own column-picker UI and drive the prop; the grid stays presentation-only:

```svelte
<Grid {rows} {columns} hiddenColumns={['bonus', 'rating']} height={640} />
```

Or set `columnMenu` for a **per-column header menu** (a ⋮ trigger, or
<kbd>Alt</kbd>+<kbd>↓</kbd> on the focused column) with **sort**, **pin**
(left/right/unpin), **Autosize** (fit to content), and **Hide column** actions,
and `columnsPanel` for a **"Columns" button** that opens a checklist to toggle
visibility (and restore hidden columns). Runtime hide/pin compose with
`hiddenColumns` / `col.pinned`, persist via `persistKey`, and hide reports through
`onColumnVisibilityChange`:

```svelte
<Grid {rows} {columns} columnMenu height={640}
  onColumnVisibilityChange={(hidden) => (myHidden = hidden)} />
```

## Header groups

Give columns a `group` label to render a spanning parent header over consecutive
columns that share it (works best with fixed-width columns):

```ts
const columns = [
  { type: 'text',  key: 'symbol', header: 'Symbol', width: 120, group: 'Holding' },
  { type: 'number', key: 'shares', header: 'Shares', width: 90,  group: 'Holding' },
  { type: 'price', key: 'last',   header: 'Last',   width: 90,  group: 'Pricing' },
];
```

## Tree data

Pass `getChildren` to render hierarchical rows — `rows` become the roots, and each
node gets an indented first column with an expand chevron when it has children:

```svelte
<Grid {rows} {columns} height={520} getChildren={(r) => r.children} />
```

In tree mode the grid renders the tree directly (filter/sort/group/paginate are
not applied to it). Nodes are keyboard-accessible: **→** expands a collapsed node,
**←** collapses an expanded one, and rows expose `aria-level` / `aria-expanded`.

## Master-detail

Pass a `detail` snippet to render an expandable panel under each row — the grid
adds a leading expand toggle and virtualizes the expanded heights (`detailHeight`,
default 160). In-memory mode:

```svelte
<Grid {rows} {columns} height={640} detailHeight={120} detail={rowDetail} />

{#snippet rowDetail({ row })}
  <div class="detail">…anything about {row.name}…</div>
{/snippet}
```

## Per-row styling

Return a class from `rowClass` to style rows by their data (e.g. red/green book
levels). Rows live inside the grid, so target the class with `:global(...)`:

```svelte
<Grid {rows} {columns} height={640} rowClass={(r) => (r.up ? 'gain' : 'loss')} />

<style>
  :global(.bo-grid .row.gain) { color: var(--up); }
  :global(.bo-grid .row.loss) { color: var(--down); }
</style>
```

For per-column styling, a column's `cellClass` (static or `(value, row)`
conditional) and `headerClass` add classes to that column's cells/header:

```ts
{ type: 'number', key: 'pnl', header: 'P&L',
  cellClass: (v) => (Number(v) < 0 ? 'loss' : 'gain'), headerClass: 'num-head' }
```

`onRowClick(row, event)` fires when a row is activated by click or <kbd>Enter</kbd>
on the focused cell — wire it to open a detail view or navigate.

Pass `rowMenu(row)` to add a **right-click menu** of row actions; each item runs
its `onSelect` and the menu closes (also on outside-click or <kbd>Esc</kbd>). It
is keyboard-accessible: the <kbd>ContextMenu</kbd> key (or
<kbd>Shift</kbd>+<kbd>F10</kbd>) opens it at the focused cell.

```svelte
<Grid {rows} {columns} height={640}
  rowMenu={(r) => [{ label: 'Delete', onSelect: () => remove(r.id) }]} />
```

## Inline editing

Mark a column `editable: true`. Double-click a cell (or press <kbd>Enter</kbd> on
the focused cell) to edit; <kbd>Enter</kbd>/blur commits, <kbd>Esc</kbd> cancels.
Or just start typing — a printable key on a focused editable cell opens the
editor seeded with that character (Excel-style type-to-edit). The editor matches
the column type: numeric columns get a number input, `date` columns a native date
picker, `options` columns a `<select>`, everything else a text input. The grid is
controlled, so it reports the change via `onCellEdit` — update your own row data
there:

```svelte
<Grid
  {rows}
  {columns}
  height={640}
  onCellEdit={(e) => (e.row[e.column.key] = e.value)}
/>
```

`e.value` is parsed to a number for numeric columns (invalid input is rejected),
otherwise the raw string. Make the edited field `$state` so the cell updates. Add
a column `validate(value, row)` to reject edits that fail your own rule (it
applies to paste too):

```ts
{ type: 'number', key: 'qty', header: 'Qty', editable: true, validate: (v) => v >= 0 }
```

Give an editable column `options` to edit it via a dropdown instead of a text
input (enum/status columns):

```ts
{ type: 'text', key: 'status', header: 'Status', editable: true,
  options: ['New', 'Active', 'Closed'] }
```

## Pinned columns

Set `pinned: true` (or `'left'`) on a column to keep it visible while the rest
scroll horizontally; `pinned: 'right'` sticks it to the right edge (e.g. an
actions or total column). Opt-in: with no pinned columns the grid stays
fit-to-width (no horizontal scroll).

```ts
const columns = [
  { type: 'text',  key: 'symbol', header: 'Symbol', width: 132, pinned: true },
  { type: 'price', key: 'price',  header: 'Price',  width: 88,  pinned: true },
  // …wider columns scroll under the pinned ones…
  { type: 'number', key: 'pnl',   header: 'P&L',    width: 96,  pinned: 'right' },
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
