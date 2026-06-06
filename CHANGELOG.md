# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [0.1.0] — Unreleased

First public release — a tiny, fast Svelte 5 data grid for fintech UIs.

### Added

- **Grid** component: config-driven columns, fixed-height virtual scrolling
  (smooth at 1,000+ rows).
- **Column types**: `text`, `price`, `percent`, `volume`, `number`, `date`,
  `heatmap`, `sparkline`.
- **Sparklines**: HiDPI canvas candlesticks with hover tooltips and a11y labels;
  `Sparkline` component + `drawCandles` / `setupHiDpiCanvas` primitives.
- **Realtime**: per-cell amber flash on value change, designed for batched
  websocket-style updates without re-rendering the table.
- **Sort & filter**: header-click sort (asc → desc → off) and a controlled
  `filter` prop; both are snapshot operations so a live feed never reshuffles.
- **Selection & aggregation**: drag / Shift-click rectangular selection, keyboard
  navigation (arrows, Shift+arrows, Ctrl/⌘+A, Ctrl/⌘+C as TSV, Esc), and a live
  Sum/Avg/Count/Min/Max footer over the numeric cells in the range.
- **Grouping**: single + nested `groupBy`, collapsible groups, sticky group
  headers, and live per-group subtotals (column `groupAgg`).
- **Server-side data**: `RowSource` interface + `createArraySource` adapter for
  windowed/paginated datasets larger than memory, with skeleton loading rows.
- **Export**: dependency-free CSV (`toCSV` / `exportCSV`) and Excel
  (`exportXLSX`, SheetJS via dynamic import — optional `xlsx` peer).
- **Column reorder**: drag headers to reorder, with optional `persistKey`
  localStorage persistence.
- **Column resize**: drag a header's right-edge grip to resize (double-click to
  reset); on by default, opt out with `resizable={false}` (grid) or
  `resizable: false` (column). Widths persist via `persistKey`.
- **Pinned columns**: `pinned: true`/`'left'`/`'right'` keeps a column visible
  during horizontal scroll, pinned to either edge (opt-in; fit-to-width
  otherwise).
- **Inline editing**: `editable: true` columns edit on double-click / Enter and
  report committed values via `onCellEdit`.
- **Clipboard paste**: **Ctrl/⌘+V** pastes a TSV block into editable cells from
  the selection's top-left (single value fills the selection; blocks clamp to
  bounds); values run through the same validation as inline editing.
- **Row height**: `rowHeight` as a number (density) or a function (variable
  per-row heights, virtualized with prefix sums + binary search).
- **Theming**: `theme` prop accepts `'dark'`/`'light'` presets or a custom token
  map; `darkTheme`/`lightTheme`/`GridTheme` exported.
- **Accessibility**: full ARIA grid semantics — `aria-rowcount`/`aria-colcount`,
  per-row/cell `aria-rowindex`/`aria-colindex`, `aria-activedescendant`,
  `aria-multiselectable`, an optional `ariaLabel` accessible name, and
  `aria-hidden` virtualization duplicates.
- **Custom cells**: `type: 'custom'` columns rendered by a `cell` snippet
  receiving `{ row, column, value }`.
- **Pivot tables**: `pivot(rows, config)` transforms flat rows into pivot
  rows + dynamic columns (row fields × a column field, aggregated measure, with
  totals) — feed the result straight to `<Grid>`.
- **Multi-column sort**: Shift-click headers to add secondary sort keys; each
  sorted header shows its position. `compareBySorts` applies keys in order.
- **Controlled sort**: optional `sort` + `onSortChange` to own the sort order
  (persist it, set an initial sort, sync to the URL); uncontrolled otherwise.
- **Row selection**: `rowSelection` adds a leading checkbox column (header
  select-all), keyed by `getRowId` (default `row.id`; override for string/
  composite keys) so it survives sort/filter; `onRowSelectionChange` reports ids.
- **Column show/hide**: controlled `hiddenColumns` (column keys) — drive your own
  column-picker UI.
- **Per-row styling**: `rowClass(row)` returns CSS class(es) per data row.
- **Row & cell clicks**: `onRowClick(row, event)` (click or Enter) and
  `onCellClick({ row, column, value }, event)`.
- **Totals footer**: `footer` pins a totals row — each column with a `groupAgg`
  aggregates all (filtered) rows, sticky to the viewport bottom.
- **Pinned top rows**: `pinnedRows` keeps rows stuck to the top, always visible
  above the scroll (a benchmark, a summary, "your position").
- **Keyboard navigation**: <kbd>Home</kbd>/<kbd>End</kbd> (row, or whole grid
  with Ctrl/⌘) and <kbd>PageUp</kbd>/<kbd>PageDown</kbd>, with Shift to extend.
- **Per-column filters**: `filterRow` adds a filter input under each column;
  rows must match every non-empty column filter (AND).
- **Column header groups**: a column `group` label renders consecutive columns
  under a spanning parent header (best with fixed-width columns).
- **Edit validation**: a column `validate(value, row)` rejects invalid edits
  (inline edit or paste), keeping the old value.
- **Select editor**: a column `options` makes an editable column edit via a
  `<select>` dropdown (enum/status columns).
- **Custom empty state**: `emptyMessage` sets the text shown when no rows match.
- **Loading overlay**: a `loading` prop shows a spinner overlay for
  consumer-driven async work (in-memory mode).
- **Cell tooltips**: a column `tooltip` sets a native `title` (full value) on
  each cell — handy when content truncates.
- **Row context menu**: `rowMenu(row)` returns right-click menu items (each with
  a `label` + `onSelect`); closes on select, outside-click, or Esc. Keyboard-
  accessible — the <kbd>ContextMenu</kbd> key (or <kbd>Shift</kbd>+<kbd>F10</kbd>)
  opens it at the focused cell.
- **Custom formatter**: a column `format(value, row)` overrides the built-in type
  formatter for display, tooltip, copy and formatted export.
- **Custom sort comparator**: a column `compare(a, b)` sorts by custom logic
  (enum priority, natural sort) instead of the default value comparison.
- **Master-detail**: a `detail` snippet renders an expandable panel under each
  row (leading expand toggle, `detailHeight`); virtualized with the height model.
- **Tree data**: `getChildren` renders hierarchical rows — `rows` become roots,
  with an indented first column and per-node expand chevrons. Keyboard-accessible
  (→ expand, ← collapse) with `aria-level` / `aria-expanded` treegrid semantics.
- **Row reorder**: `onRowReorder(from, to)` enables drag-to-reorder via a
  first-column handle (flat, unsorted, in-memory lists).
- **Per-column class hooks**: `cellClass` (static or `(value, row)` conditional)
  and `headerClass` for styling individual columns via `:global`.
- **Pagination**: `pageSize` switches to a paged view with a pager (first/prev/
  next/last) instead of one long scroll; rows still virtualize within a page.
  Optionally controlled via `page` + `onPageChange` (URL-synced paging).
- **Resize clamps**: per-column `minWidth`/`maxWidth` bound drag-resizing.
- **Layout callbacks**: `onColumnReorder(keys)` and `onColumnResize(key, width)`
  report header drag-reorder / resize so apps can persist layout server-side.
- **Release tooling**: `pnpm release` / `pnpm release:dry` run all gates then
  publish.
- **Theming**: dark-first, self-contained CSS variables (`--bo-grid-*`), no CSS
  import required.

[0.1.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.1.0
