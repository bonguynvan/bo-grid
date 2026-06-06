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

## In progress — 0.3 · Filtering & discoverability

Closing the biggest functional gap vs heavyweight grids: rich, built-in column
filtering with a proper UI. **Guiding principle: keep the core tiny** — the heavy
menu UI is **lazy-loaded inside `Grid`** (like the demo's examples and the `xlsx`
export), so the ~20 KB core only grows by the small pure filter logic, and you
download a menu only when you open one.

- [x] **M1 — Filter model + logic** (`filtering.ts`): a typed `ColumnFilter`
  (text / number / date operators + a set filter) with pure, unit-tested
  matching (`matchesFilter`, `passesFilters`, `distinctValues`). `view` now
  filters through it; the existing `filterRow` is migrated onto it,
  behavior-preserved.
- [ ] **M2 — Header filter menu** (lazy `FilterMenu.svelte`): click a header →
  the right control for the column type (text contains/equals/starts/ends,
  number `=, ≠, <, ≤, >, between`, date before/after/on/between).
- [ ] **M3 — Set filter**: a searchable checkbox list of a column's distinct
  values (select-all / clear) — the AG-Grid-signature filter.
- [ ] **M4 — Column header menu** (lazy `ColumnMenu.svelte`): sort / pin /
  hide / filter from one place.
- [ ] **M5 — Quick filter**: an optional built-in global search input.

New (additive) API under consideration: `columnFilters` (enable header menus),
per-column `filter?: false | 'text' | 'number' | 'date' | 'set'`, `columnMenu`,
`quickFilter`, `onFilterChange` (controlled), and a structured `columnFilters`
field on `RowSourceParams` for server-side filtering.

## Candidate themes for later versions

- **Spreadsheet power** — fill handle (Excel drag-to-fill), undo/redo, more cell
  editors (date picker, stepper, autocomplete), auto-size column to content.
- **Scale & server** — full server-side row model (lazy group/tree level
  loading), horizontal column virtualization for 100+ column grids.
- **Trust & polish** — a formal WCAG 2.1 AA audit, more theme presets + a
  theming guide, additional demos, visual-regression tests.

Out of scope by design (they fight the "tiny" positioning): integrated charting
(sparklines cover the right-sized need), viewport row model, RTL — unless real
demand appears.

Ideas and feedback welcome — open an issue.
