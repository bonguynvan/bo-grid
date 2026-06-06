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

## In progress — 0.5 · Spreadsheet power

Excel-grade editing. Lib budget recalibrated 24 → 28 KB (still ~15–20× smaller
than AG Grid; heavy UI stays lazy and excluded from the core count).

- [x] **M1 — Fill handle** (`fillHandle`): drag the selection's corner to copy
  the selected value(s) across the extended range (editable columns; tiles).
- [ ] **M2 — Undo / redo** (Ctrl+Z / Ctrl+Y) for edits, paste and fill.
- [ ] **M3 — Typed inline editors**: date columns edit with a date picker, number
  columns with a numeric input (today the editor is a plain text input).
- [ ] **M4 — Autosize column to content** (carried over from 0.4): double-click
  the header border to fit. Needs DOM measurement — verify in a real browser.

## Candidate themes for later versions

- **Controlled/server filtering** — `onFilterChange` + a structured
  `columnFilters` field on `RowSourceParams`.
- **Scale & server** — full server-side row model (lazy group/tree level
  loading), horizontal column virtualization for 100+ column grids.
- **Trust & polish** — a formal WCAG 2.1 AA audit, more theme presets + a
  theming guide, additional demos, visual-regression tests.

Out of scope by design (they fight the "tiny" positioning): integrated charting
(sparklines cover the right-sized need), viewport row model, RTL — unless real
demand appears.

Ideas and feedback welcome — open an issue.
