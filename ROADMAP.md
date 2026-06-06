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

## In progress — 0.4 · Column management & discoverability

Runtime column management — the part AG Grid does that needs real capability.
Heavy UI (the tool panel) is lazy-loaded; the light column menu reuses the
in-core action menu.

- [x] **M1 — Column header menu + runtime hide** (`columnMenu`, a ⋮ trigger):
  Sort asc/desc/clear + Hide column. Runtime-hidden set unions with the
  controlled `hiddenColumns`, persists via `persistKey`, reports via
  `onColumnVisibilityChange`.
- [x] **M2 — Runtime pinning**: Pin left / Pin right / Unpin from the menu,
  layered over static `col.pinned`, persisted.
- [x] **M3 — Columns tool panel** (lazy `ToolPanel.svelte`): `columnsPanel` adds a
  "Columns" button → a checklist to toggle visibility / restore hidden columns.
- [ ] **M4 — Autosize column to content**: double-click the header border to fit.
  Deferred — needs DOM width measurement (can't be verified in the headless
  smoke test) and the core budget is tight; revisit with the budget recalibration.

Shipped API (all additive): `columnMenu`, `columnsPanel`,
`onColumnVisibilityChange`.

## Candidate themes for later versions

- **Spreadsheet power** — fill handle (Excel drag-to-fill), undo/redo, more cell
  editors (date picker, stepper, autocomplete), auto-size column to content.
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
