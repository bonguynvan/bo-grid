# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/); versions follow semver.

## [0.16.0] — Unreleased

Theme: **scale — column (horizontal) virtualization** for very wide grids. See
[ROADMAP.md](./ROADMAP.md).

### Added

- **Column virtualization** (`virtualizeColumns`): for wide grids (100+ columns),
  render only the columns within the horizontal scroll window (+ overscan). A
  60-column grid then costs about the same as a handful of columns. Off-window runs
  collapse into a single spacer so widths and positions stay exact; **pinned
  columns always render**. Opt-in; forces fixed-width horizontal scroll (the same
  layout pinning already uses). New **Wide** demo (60+ columns + pinned label).
- The windowing math is a pure, unit-tested module (`colvirt.ts`).

### Changed

- **Library size budget recalibrated 28 → 32 KB** (gzip, eager core). The analytics
  + scale wave (conditional formatting, computed columns, more rich types, column
  virtualization) grew the always-loaded core to ~28 KB — still ~15× smaller than
  AG Grid (~500 KB). The charts companion keeps its own 8 KB budget; heavy menu UI
  stays lazy and excluded.

## [0.15.0] — Unreleased

Theme: **accessibility (WCAG 2.1 AA audit)** — trust & polish. See
[ACCESSIBILITY.md](./ACCESSIBILITY.md).

### Added

- **Keyboard-navigable menus** (APG menu pattern): the row/column menus now move
  focus into the menu on open, navigate with <kbd>↑ ↓ Home End</kbd>, activate with
  <kbd>Enter</kbd>, close on <kbd>Esc</kbd>/<kbd>Tab</kbd>, and **return focus** to
  the opener.
- **Keyboard path to filtering**: a **Filter…** item in the column menu
  (<kbd>Alt</kbd>+<kbd>↓</kbd>) opens the filter menu without the mouse.
- **ACCESSIBILITY.md** — documents roles, the keyboard model, focus handling,
  measured contrast ratios, and motion/status-message conformance.

### Fixed

- **Visible focus indicators** (WCAG 2.4.7) on every keyboard-reachable control —
  headers, menu items, pager, filter & columns panels, tree/expand toggles, links,
  the quick-filter box and the column tool toggle (plus the demo's tabs and theme
  toggle). Native controls keep their themed platform rings.

### Notes

- Verified: ARIA grid/treegrid semantics, `aria-sort`, `aria-activedescendant`,
  reduced-motion guards (flash/spinner/shimmer), `aria-live` loading, and AA
  contrast on both presets — all already in place; no token changes were needed.

## [0.14.0] — Unreleased

Theme: **`bo-grid/charts` companion** — tiny dashboard charts, kept out of the
grid core. See [ROADMAP.md](./ROADMAP.md).

### Added

- **`bo-grid/charts` subpath** — an optional, dependency-free SVG chart set for
  dashboards: `LineChart` (with optional `area`), `BarChart` (signed, zero-axis)
  and `DonutChart` (pie when `thickness >= size/2`). Themeable via `color`/`colors`
  props or `--boc-*` CSS vars. Imported separately
  (`import { LineChart } from 'bo-grid/charts'`) so it adds **nothing** to the grid
  core — the companion is ~2 KB gzip on its own budget.
- Exposed the SVG geometry helpers (`linePoints`, `linePath`, `areaPath`,
  `barRects`, `donutArcs`, `extent`) and `CHART_PALETTE` for building custom charts.
- New **Dashboard** demo: KPI cards (standalone charts) and **charts inside grid
  cells** (a `LineChart` in each row's custom Trend column).

### Internal

- `size:lib` now measures the charts companion under its own budget (8 KB); the
  grid core budget (28 KB) is unaffected since charts are a separate entry.

## [0.13.0] — Unreleased

Theme: **more rich cell types** — `link`, `relative` (relative time) and
`currency`. See [ROADMAP.md](./ROADMAP.md).

### Added

- **`link` columns** (`type: 'link'`): render the value as an anchor. `href(row)`
  builds the target (defaults to the value); `newTab` opens in a new tab (with
  `rel="noopener noreferrer"`). URLs are sanitized — `javascript:`/`data:`/
  `vbscript:` are blocked and render as plain text (`safeHref`).
- **`relative` columns** (`type: 'relative'`): format an epoch-ms value as human
  relative time (`3 hours ago`, `in 2 days`). New `relativeTime(ms, now?)`
  formatter (exported).
- **`currency` columns** (`type: 'currency'`): localized currency via
  `Intl.NumberFormat` (`currency` ISO code, `locale`, `decimals`); falls back to a
  fixed-decimal number for an unknown code. New `fmtCurrency` formatter (exported).
- The **Team** demo now shows all three (email link, last-active relative time,
  hourly rate currency) with the Member column pinned.

## [0.12.0] — Unreleased

Theme: **computed columns** — derive a column from the whole row (KPIs, ratios,
deltas) for dashboards & analytics. See [ROADMAP.md](./ROADMAP.md).

### Added

- **Computed columns** (`col.value: (row) => …`): a column's value is derived from
  the whole row instead of read from `row[key]`. The derived value flows through
  **display, sort, filter (incl. quick filter + set filter), group/footer
  aggregation, conditional formatting, export, copy and the cell-click payload** —
  everywhere a real column does. `key` still identifies the column (sort/filter
  key) but need not be a real field. Computed columns aren't editable (no field to
  write back). In-memory mode (a server source owns its own derivations). The
  **Portfolio** demo adds a derived **Cost Basis** column (shares × avg cost).

## [0.11.0] — Unreleased

Theme: **colour scales** — completes the conditional-formatting trio (data bars +
icon sets + colour scales). See [ROADMAP.md](./ROADMAP.md).

### Added

- **Colour scales** (`col.colorScale`): tint a numeric column's cell backgrounds
  across its value range — a soft, themed heat ramp. Auto-ranges over the current
  view (or set `min`/`max`); pass `mid` (e.g. `mid: 0`) for a 3-stop diverging
  scale (down → neutral → up). `colors` overrides the stops (`[low, high]` or
  `[low, mid, high]`). Translucent by default so row striping shows through and
  text stays readable; works on any numeric column (unlike the fixed `heatmap`
  type, which it complements). Exported `ColorScaleConfig`. The **Portfolio** demo
  now uses an auto-ranged diverging scale on P&L %.

### Changed

- Data-bar `min`/`max` resolution moved into the (now shared) range pipeline —
  identical behaviour, but data bars and colour scales now share one per-column
  data-extent pass. Pinned cells with a heat/scale tint now layer it over the row
  colour so they stay opaque during horizontal scroll (also fixes pinned heatmap
  cells).

## [0.10.0] — Unreleased

Theme: **conditional formatting** — the analytics & reporting layer (see
[ROADMAP.md](./ROADMAP.md)).

### Added

- **Data bars** (`col.dataBar`): an in-cell horizontal bar painted behind the
  value, scaled across the column's range. The range auto-computes over the
  current view, or set `min`/`max` (`min: 0` gives absolute proportional bars).
  Bars diverge left/right around a zero baseline when the range spans negatives;
  `color`/`negative` override the default up/down theme colours.
- **Icon sets** (`col.icons`): show an icon beside the value, chosen by the
  highest threshold `at` that is ≤ the value (e.g. `▲`/`▼` by sign, or a 3-band
  scale). Each rule takes a semantic `tone` (`up`/`down`/`amber`/`info`/`neutral`)
  for its colour.
- Both are themed, work with flashing/live cells, and add nothing to the core for
  grids that don't use them. The **Portfolio** demo shows data bars on Mkt Value
  and diverging bars + sign icons on P&L.

## [0.9.0] — Unreleased

Theme: **rich cell types** — for any business domain (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Rich built-in column types** beyond fintech numbers: `progress` (in-cell bar,
  `min`/`max`), `rating` (stars, `max`), `tags` (chips from a `string[]` or
  comma-separated string), `badge` (status pill coloured via a `tones` map),
  `boolean` (✓/✕ with optional `trueLabel`/`falseLabel`), and `avatar` (initials +
  name, optional `sub`). All themed from the design tokens; copy/export render
  sensible text. Makes bo-grid a fit for CRM, project, admin and content apps —
  not just trading. New **Team** demo showcases them.

## [0.8.0] — Unreleased

Theme: **design tokens & polish** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Deep theming tokens**: shape and density are themeable too — `radius`,
  `fontSize` and `cellPad` (`--bo-grid-radius` / `--bo-grid-font-size` /
  `--bo-grid-cell-pad`), alongside the existing colour/typography tokens. Compact,
  roomy, rounded or branded looks are a small token map (or a few CSS vars) away.
- **Themed scrollbars**: thin, theme-coloured scrollbars in the grid viewport
  (Firefox `scrollbar-*` + Chromium/Safari `::-webkit-scrollbar`).

### Fixed

- **Sparkline now follows the theme**: candle colours read the grid's up/down
  tokens, and the hover tooltip uses the themed surface (was a hardcoded black
  background — dark text on black, unreadable on light themes).

## [0.7.0] — Unreleased

Theme: **column sizing & keyboard polish** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Autosize column to content**: the column menu's **Autosize** action fits a
  column to its content (a fast character-count heuristic; respects
  `minWidth`/`maxWidth` and persists like a manual resize).
- **Keyboard access to the column menu**: <kbd>Alt</kbd>+<kbd>↓</kbd> opens the
  column menu at the focused column (previously mouse-only via the ⋮ trigger).
- **Themed form controls**: checkboxes, date pickers, number spinners, search
  inputs and scrollbars now follow the grid theme (via `color-scheme` +
  `accent-color`), so they no longer render with light browser defaults on a dark
  grid. A custom theme can set `scheme: 'light' | 'dark'`.

## [0.6.0] — Unreleased

Theme: **controlled & server-side filtering** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Controlled filtering**: a `columnFilters` prop + `onFilterChange` callback let
  you own the filter state (persist it, set initial filters, sync to the URL) —
  mirrors controlled `sort`. `ColumnFilter` / `FilterKind` / op types are exported.
- **Server-side filtering**: `RowSourceParams` gains `columnFilters`, so the header
  filter menu works in source mode — text/number/date filters delegate to the
  `RowSource` (set filters need in-memory data). `createArraySource` applies them.

## [0.5.0] — Unreleased

Theme: **spreadsheet power** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Fill handle**: with `fillHandle`, the selection shows an Excel-style square at
  its bottom-right corner — drag it to copy the selected value(s) across the
  extended range (down/right). Editable columns only; multi-cell selections tile.
- **Undo / redo**: <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Ctrl/⌘</kbd>+<kbd>Y</kbd>
  (or <kbd>Shift</kbd>+<kbd>Z</kbd>) for edits, paste and fill. History is keyed
  by row reference so it survives sort/filter; a paste or fill is one step.
- **Typed inline editors**: editable `number`/`price`/`percent`/`volume` columns
  edit with a numeric input, and `date` columns with a native date picker
  (`date` columns are now editable). Other columns keep the text input.

## [0.4.0] — Unreleased

Theme: **column management & discoverability** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Column header menu**: `columnMenu` adds a ⋮ trigger to each header with
  Sort ascending / descending / Clear, **Pin left / Pin right / Unpin**, and
  **Hide column**. Runtime-hidden columns compose (union) with the controlled
  `hiddenColumns`, persist via `persistKey`, and report through
  `onColumnVisibilityChange`; runtime pins layer over static `col.pinned` and
  also persist.
- **Columns tool panel**: `columnsPanel` adds a "Columns" button that opens a
  searchable checklist to toggle column visibility (and **restore** columns
  hidden via the menu — Show all). Lazy-loaded.

## [0.3.0] — Unreleased

Theme: **filtering & discoverability** (see [ROADMAP.md](./ROADMAP.md)).

### Added

- **Header filter menu**: `filterMenu` adds a funnel to each filterable column;
  clicking it opens a menu whose control matches the column type — text
  (contains / equals / starts / ends), number (`=, ≠, <, ≤, >, ≥, between`), or
  date (before / after / on / between). Override or disable per column with
  `col.filter` (`'text'|'number'|'date'|'set'|false`). The menu UI is
  **lazy-loaded** on first open, so the core bundle is unaffected until used.
- **Set filter**: `col.filter: 'set'` gives a column a searchable checkbox list
  of its distinct values (All / None), filtering to the checked ones.
- **Quick filter**: a built-in `quickFilter` search box above the grid that
  matches across all columns (a batteries-included alternative to the `filter`
  prop).

### Internal

- Structured per-column filter model (`filtering.ts`): typed `ColumnFilter`
  (text/number/date operators + a set filter) with pure, unit-tested matching.
  The grid's filtering runs through it; the existing `filterRow` is migrated onto
  it with no behavior change.

## [0.2.0] — 2026-06-06

A large batch of additive, backward-compatible features on top of the initial
`0.1.0` release. No breaking changes — everything new is opt-in.

### Added

- **Multi-column sort**: Shift-click headers to add secondary sort keys; each
  sorted header shows its position. `compareBySorts` applies keys in order.
- **Controlled sort**: optional `sort` + `onSortChange` to own the sort order
  (persist it, set an initial sort, sync to the URL); uncontrolled otherwise.
- **Per-column filters**: `filterRow` adds a filter input under each column;
  rows must match every non-empty column filter (AND).
- **Column resize**: drag a header's right-edge grip to resize (double-click to
  reset); on by default, opt out with `resizable={false}` (grid) or
  `resizable: false` (column). Widths persist via `persistKey`.
- **Resize clamps**: per-column `minWidth`/`maxWidth` bound drag-resizing.
- **Column show/hide**: controlled `hiddenColumns` (column keys) — drive your own
  column-picker UI.
- **Column header groups**: a column `group` label renders consecutive columns
  under a spanning parent header (best with fixed-width columns).
- **Layout callbacks**: `onColumnReorder(keys)` and `onColumnResize(key, width)`
  report header drag-reorder / resize so apps can persist layout server-side.
- **Row selection**: `rowSelection` adds a leading checkbox column (header
  select-all), keyed by `getRowId` (default `row.id`; override for string/
  composite keys) so it survives sort/filter; `onRowSelectionChange` reports ids.
  Press <kbd>Space</kbd> to toggle the focused row from the keyboard.
- **Row reorder**: `onRowReorder(from, to)` enables drag-to-reorder via a
  first-column handle (flat, unsorted, in-memory lists).
- **Pagination**: `pageSize` switches to a paged view with a pager (first/prev/
  next/last) instead of one long scroll; rows still virtualize within a page.
  Optionally controlled via `page` + `onPageChange` (URL-synced paging).
- **Keyboard navigation**: <kbd>Home</kbd>/<kbd>End</kbd> (row, or whole grid
  with Ctrl/⌘) and <kbd>PageUp</kbd>/<kbd>PageDown</kbd>, with Shift to extend.
- **Clipboard paste**: **Ctrl/⌘+V** pastes a TSV block into editable cells from
  the selection's top-left (single value fills the selection; blocks clamp to
  bounds); values run through the same validation as inline editing.
- **Type-to-edit**: pressing a printable key on a focused editable cell opens the
  editor seeded with that character (Excel-style), no double-click needed.
- **Edit validation**: a column `validate(value, row)` rejects invalid edits
  (inline edit or paste), keeping the old value.
- **Select editor**: a column `options` makes an editable column edit via a
  `<select>` dropdown (enum/status columns).
- **Master-detail**: a `detail` snippet renders an expandable panel under each
  row (leading expand toggle, `detailHeight`); virtualized with the height model.
- **Tree data**: `getChildren` renders hierarchical rows — `rows` become roots,
  with an indented first column and per-node expand chevrons. Keyboard-accessible
  (→ expand, ← collapse) with `aria-level` / `aria-expanded` treegrid semantics.
- **Totals footer**: `footer` pins a totals row — each column with a `groupAgg`
  aggregates all (filtered) rows, sticky to the viewport bottom.
- **Pinned top rows**: `pinnedRows` keeps rows stuck to the top, always visible
  above the scroll (a benchmark, a summary, "your position").
- **Pin right**: `pinned: 'right'` keeps a column pinned to the right edge during
  horizontal scroll (in addition to `true`/`'left'`).
- **Custom formatter**: a column `format(value, row)` overrides the built-in type
  formatter for display, tooltip, copy and formatted export.
- **Custom sort comparator**: a column `compare(a, b)` sorts by custom logic
  (enum priority, natural sort) instead of the default value comparison.
- **Per-column class hooks**: `cellClass` (static or `(value, row)` conditional)
  and `headerClass` for styling individual columns via `:global`.
- **Per-row styling**: `rowClass(row)` returns CSS class(es) per data row.
- **Row & cell clicks**: `onRowClick(row, event)` (click or Enter) and
  `onCellClick({ row, column, value }, event)`.
- **Row context menu**: `rowMenu(row)` returns right-click menu items (each with
  a `label` + `onSelect`); closes on select, outside-click, or Esc. Keyboard-
  accessible — the <kbd>ContextMenu</kbd> key (or <kbd>Shift</kbd>+<kbd>F10</kbd>)
  opens it at the focused cell.
- **Cell tooltips**: a column `tooltip` sets a native `title` (full value) on
  each cell — handy when content truncates.
- **Custom empty state**: `emptyMessage` sets the text shown when no rows match.
- **Loading overlay**: a `loading` prop shows a spinner overlay for
  consumer-driven async work (in-memory mode).
- **Accessible name**: an optional `ariaLabel` sets the grid's accessible name.
- **SSR / SvelteKit-safe**: `<Grid>` server-renders without touching browser
  globals; `sideEffects: false` for tree-shaking. A `pnpm ssr` gate (in CI and
  the release) server-renders the grid to guard against regressions.

### Internal

- Release gates now run `check` → `test` → `ssr` → `package` → `smoke` → `size`
  → `size:lib`. Added direct unit tests for the public formatters and
  `heatColor`; nine-example demo gallery with code-split lazy loading.

## [0.1.0] — 2026-06-06

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
- **Pinned columns**: `pinned: true`/`'left'` keeps a column visible during
  horizontal scroll, pinned to the left edge (opt-in; fit-to-width otherwise).
- **Inline editing**: `editable: true` columns edit on double-click / Enter and
  report committed values via `onCellEdit`.
- **Row height**: `rowHeight` as a number (density) or a function (variable
  per-row heights, virtualized with prefix sums + binary search).
- **Theming**: `theme` prop accepts `'dark'`/`'light'` presets or a custom token
  map; `darkTheme`/`lightTheme`/`GridTheme` exported. Dark-first, self-contained
  CSS variables (`--bo-grid-*`), no CSS import required.
- **Accessibility**: full ARIA grid semantics — `aria-rowcount`/`aria-colcount`,
  per-row/cell `aria-rowindex`/`aria-colindex`, `aria-activedescendant`,
  `aria-multiselectable`, and `aria-hidden` virtualization duplicates.
- **Custom cells**: `type: 'custom'` columns rendered by a `cell` snippet
  receiving `{ row, column, value }`.
- **Pivot tables**: `pivot(rows, config)` transforms flat rows into pivot
  rows + dynamic columns (row fields × a column field, aggregated measure, with
  totals) — feed the result straight to `<Grid>`.
- **Release tooling**: `pnpm release` / `pnpm release:dry` run all gates then
  publish.

[0.16.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.16.0
[0.15.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.15.0
[0.14.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.14.0
[0.13.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.13.0
[0.12.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.12.0
[0.11.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.11.0
[0.10.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.10.0
[0.9.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.9.0
[0.8.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.8.0
[0.7.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.7.0
[0.6.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.6.0
[0.5.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.5.0
[0.4.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.4.0
[0.3.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.3.0
[0.2.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.2.0
[0.1.0]: https://github.com/bonguynvan/bo-grid/releases/tag/v0.1.0
