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

## 0.9 · Rich cell types — done

Scaling beyond fintech into CRM / projects / admin / content / analytics.

- [x] **Rich built-in types**: `progress`, `rating`, `tags`, `badge`, `boolean`,
  `avatar` — all themed from the design tokens. New **Team** demo.

## 0.10 · Conditional formatting — done

The analytics & reporting layer — visual cues painted into the cells themselves,
adding nothing to the core for grids that don't opt in.

- [x] **Data bars** (`col.dataBar`): in-cell bars behind values, auto-ranged over
  the view (or explicit `min`/`max`); diverge around a zero baseline for signed
  columns; `color`/`negative` overrides.
- [x] **Icon sets** (`col.icons`): threshold-driven icon beside the value, each
  rule with a semantic `tone`. **Portfolio** demo shows both on Mkt Value / P&L.

## 0.11 · Colour scales — done

Completes the conditional-formatting trio (data bars + icon sets + colour scales).

- [x] **Colour scales** (`col.colorScale`): cell-background heat ramp across the
  value range, auto-ranged over the view (or explicit `min`/`max`); 2-stop, or
  3-stop diverging via `mid`; `colors` overrides the stops. Soft/translucent by
  default; works on any numeric column (complements the fixed `heatmap` type).
  **Portfolio** P&L % now uses an auto-ranged diverging scale.

## 0.12 · Computed columns — done

- [x] **Computed columns** (`col.value: (row) => …`): derive a column's value from
  the whole row (KPIs, ratios, deltas). Flows through display, sort, filter,
  group/footer aggregation, conditional formatting, export and copy. Not editable;
  in-memory mode. **Portfolio** adds a derived Cost Basis column.

## 0.13 · More rich types — done

- [x] **`link`** (anchor, `href(row)`, `newTab`, sanitized), **`relative`**
  (epoch ms → "3 hours ago"), **`currency`** (localized via `Intl.NumberFormat`).
  Exported `relativeTime` / `fmtCurrency`. **Team** demo shows all three.

## 0.14 · Charts companion — done

- [x] **`bo-grid/charts`** subpath: `LineChart`/`BarChart`/`DonutChart`, SVG,
  dependency-free, ~2 KB gzip on its own budget — **nothing added to the grid
  core**. Themeable via props or `--boc-*` vars; geometry helpers exported. New
  **Dashboard** demo (KPI cards + charts inside grid cells).

## 0.15 · Accessibility (WCAG 2.1 AA) — done

- [x] Audit + fixes: keyboard-navigable menus (APG pattern, focus return), a
  keyboard path to filtering (column-menu **Filter…**), visible `:focus-visible`
  rings on every reachable control. Verified ARIA grid/treegrid semantics,
  reduced-motion guards, `aria-live` loading, and AA contrast (no token changes
  needed). New **ACCESSIBILITY.md**.

## 0.16 · Scale — column virtualization — done

- [x] **Column (horizontal) virtualization** (`virtualizeColumns`): render only the
  columns in the horizontal window (+ overscan) for 100+ column grids; off-window
  runs collapse into spacers; pinned columns always render. Pure windowing math in
  `colvirt.ts`. New **Wide** demo. Core budget recalibrated 28 → 32 KB.

## 0.17 · Server-side / lazy tree loading — done

- [x] **Async tree children** (`loadChildren` + `hasChildren`): load a node's
  children on expand (server-backed trees), with a loading row and a children
  cache. Sync `getChildren` unchanged. New **Lazy tree** demo. (`buildTreeRows`
  generalized to a pure `TreeAccess` resolver; unit-tested.)

## 0.18 · More theme presets — done

- [x] Four new presets — `highContrastDark`/`highContrastLight` (a11y), `midnight`,
  `terminal` — plus `themePresets` map + `ThemePreset` type. New **Themes** demo.

## 0.19 · More charts — done

- [x] **`StackedBarChart`** (stacked/grouped multi-series), **`Legend`**, and SVG
  `<title>` **hover tooltips** on bar/stacked/donut — all in the companion (core
  untouched; charts ~3 KB). New stacked card in the **Dashboard** demo.

## 0.20 · Server-side (lazy) grouping — done

- [x] **`lazyGroups` + `loadGroup`**: server group summaries (count + aggregates)
  render as collapsed headers; each group's rows load on expand (loading row +
  cache), reusing the lazy-tree machinery. `buildLazyGroupRows` pure + tested.
  New **Server groups** demo.

## 0.21 · Framework-agnostic custom element — done

- [x] **`bo-grid/element`**: a `<bo-grid>` Web Component (Svelte compiled to a
  custom element, styles auto-injected, whole API via a `config` property) usable
  from **React, Vue, Angular and vanilla** — see [docs/frameworks.md](./docs/frameworks.md).
  `wc-smoke` gate verifies it registers + renders + reacts.

## 0.22 · CSV import — done

- [x] **`parseCSV` / `parseCSVMatrix`**: round-trip the CSV export — RFC4180-aware
  parse into `GridRow`s (header→column mapping, numeric/date coercion). New **CSV
  import** demo.

## Candidate themes for later versions

The roadmap's planned features are all shipped, plus cross-framework support and
CSV round-trip. Remaining ideas are polish or demand-driven:

- **Polish** — a live screen-reader + axe-core pass; framework starter repos;
  multi-level lazy groups; custom-cell bridging for the Web Component.
- Driven by real-world usage now that it's published — open an issue with what's
  missing.

Note: the eager grid core is ~97% of its 28 KB budget; the next sizable *core*
feature should recalibrate it (still ~15× smaller than AG Grid). The charts
companion (its own 8 KB budget) is the model for keeping the core tiny.

Out of scope by design (they fight the "tiny" positioning): a heavyweight
integrated-charting engine in the core (the companion package is the answer),
viewport row model, RTL — unless real demand appears.

Ideas and feedback welcome — open an issue.
