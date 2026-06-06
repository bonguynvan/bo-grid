# Roadmap

Shipped and planned work. Versions follow semver; everything is additive and
backward-compatible unless noted.

## Shipped

- **0.1.0** — initial release (core grid, sparklines, realtime, sort/filter,
  selection, grouping, server-side `RowSource`, export, column reorder, inline
  edit, variable height, theming, ARIA, custom cells, pivot).
- **0.2.0** — the full grid: multi/controlled sort, per-column filter row,
  column resize/pin(L/R)/show-hide/header-groups, row selection, pagination,
  master-detail, tree data, row reorder, totals footer, pinned rows, tooltips,
  context menu, custom format/compare, type-to-edit, full keyboard a11y, and
  verified SSR/SvelteKit safety. ~45 features in ~20 KB gzip.

## 0.3 · Filtering & discoverability — done

Closed the biggest functional gap vs heavyweight grids: rich, built-in column
filtering. **Guiding principle: keep the core tiny** — heavy menu UI is
**lazy-loaded inside `Grid`**, so the core only grows by small glue and you
download a menu only when you open one.

- [x] **M1 — Filter model + logic** (`filtering.ts`): typed `ColumnFilter`
  (text/number/date operators + set), pure + unit-tested; `view` filters through
  it; `filterRow` migrated onto it.
- [x] **M2 — Header filter menu** (lazy `FilterMenu.svelte`): per-column funnel,
  type-aware controls. `filterMenu` + per-column `col.filter`.
- [x] **M3 — Set filter**: `col.filter: 'set'` — checkbox list of distinct values.
- [x] **M5 — Quick filter**: built-in `quickFilter` global search box.

## 0.4 · Column management & discoverability — done

Runtime column management — the part AG Grid does that needs real capability.
Heavy UI (the tool panel) is lazy-loaded; the light column menu reuses the
in-core action menu.

- [x] **M1 — Column header menu + runtime hide** (`columnMenu`).
- [x] **M2 — Runtime pinning** (Pin left/right/Unpin), layered over `col.pinned`.
- [x] **M3 — Columns tool panel** (lazy `ToolPanel.svelte`, `columnsPanel`).

Shipped API (all additive): `columnMenu`, `columnsPanel`,
`onColumnVisibilityChange`.

## 0.5 · Spreadsheet power — done

Excel-grade editing. Lib budget recalibrated 24 → 28 KB (still ~15–20× smaller
than AG Grid; heavy UI stays lazy and excluded from the core count).

- [x] **M1 — Fill handle** (`fillHandle`): drag the selection's corner to copy
  the selected value(s) across the extended range (editable columns; tiles).
- [x] **M2 — Undo / redo** (Ctrl+Z / Ctrl+Y) for edits, paste and fill; row-keyed
  history (survives sort/filter); paste/fill undo as one step.
- [x] **M3 — Typed inline editors**: numeric columns edit with a number input,
  `date` columns with a native date picker (date columns are now editable).
- [x] **M4 — Autosize** — shipped in 0.7 (content heuristic, not DOM measurement).

## 0.6 · Controlled & server-side filtering — done

- [x] **M1 — Controlled filtering**: `columnFilters` prop + `onFilterChange`
  (mirrors controlled `sort`); `ColumnFilter`/`FilterKind` types exported.
- [x] **M2 — Server-side filtering**: `RowSourceParams.columnFilters`; the filter
  menu works in source mode (text/number/date delegate to the `RowSource`).

## 0.7 · Column sizing & keyboard polish — done

- [x] **Autosize column to content** via the column menu (character-count
  heuristic; respects min/max; persists like a manual resize).
- [x] **Keyboard access to the column menu** (<kbd>Alt</kbd>+<kbd>↓</kbd>).
- [x] **Themed native form controls** (checkbox / date / spinners / scrollbars)
  via `color-scheme` + `accent-color`.

## 0.8 · Design tokens & polish — done

- [x] **Deep theming tokens**: `radius`, `fontSize`, `cellPad` (shape + density),
  on top of colour/typography — any look from a small token map.
- [x] **Themed scrollbars** in the viewport (Firefox + Chromium/Safari).

## Candidate themes for later versions

- **Scale & server** — full server-side row model (lazy group/tree level
  loading), horizontal column virtualization for 100+ column grids.
- **Trust & polish** — a formal WCAG 2.1 AA audit, more theme presets + a
  theming guide, additional demos, visual-regression tests.

Out of scope by design (they fight the "tiny" positioning): integrated charting
(sparklines cover the right-sized need), viewport row model, RTL — unless real
demand appears.

Ideas and feedback welcome — open an issue.
