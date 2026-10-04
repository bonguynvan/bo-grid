# Accessibility

bo-grid targets **WCAG 2.1 AA**. This document records the accessibility posture,
the keyboard model, and the conformance notes from the 0.15 audit.

## Roles & semantics (1.3.1, 4.1.2)

- The grid is `role="grid"` (`role="treegrid"` with tree data) with
  `aria-rowcount` / `aria-colcount` reflecting the **true** dataset size (not the
  virtualized window), an optional `ariaLabel`, and `aria-multiselectable` when
  range selection is on. It holds only rows: the toolbar (quick filter, Columns
  button), aggregation bar, pager, menus and panels sit beside it inside the
  `.bo-grid` box, so keys typed in them never reach the grid's own shortcuts.
- Rows are `role="row"` with 1-based `aria-rowindex`; cells are `role="gridcell"`
  with `aria-colindex` and `aria-selected`. Every control in a row sits in a
  cell: the expand and checkbox columns, the filter row's inputs, the footer's
  totals and a group row's toggle and subtotals are all `gridcell`s with their
  column index. Off-screen virtualization duplicates are `aria-hidden`, and the
  sticky group header copied over the scroll keeps its toggle out of the tab
  order.
- Column headers are focusable `role="columnheader"` elements with `aria-sort`
  (`ascending` / `descending` / `none`) kept in sync with the sort state, and
  an explicit name: the header text, or the column key when the header is
  empty (the sort arrows and the filter / menu buttons inside are not part of
  it). Enter or Space sorts, Shift adds a sort key. The master-detail expand
  column's header is named by the `detailColumn` label. axe-core reports no
  violations on the demo's headers.
- The row-number column (`rowNumbers`) is made of `role="rowheader"` cells, so
  a screen reader announces the row's number as focus moves along it. Its
  header is named by the `rowNumber` label.
- Tree data uses the treegrid semantics: `aria-level`, `aria-expanded`, and
  `ArrowRight`/`ArrowLeft` to expand/collapse.
- Floating menus are `role="menu"` / `role="menuitem"`; the filter and columns
  panels are `role="dialog"` with an accessible name.
- The focus cell is advertised via `aria-activedescendant`, so assistive tech
  follows the active cell as it moves.

## Keyboard model (2.1.1, 2.1.2)

The grid is a single tab stop (APG grid pattern); navigate **within** it by key:

| Keys | Action |
|------|--------|
| <kbd>↑ ↓ ← →</kbd> | Move the focus cell |
| <kbd>Shift</kbd> + arrows | Extend the selection |
| <kbd>Home</kbd> / <kbd>End</kbd> | First / last column (+<kbd>Ctrl/⌘</kbd> = first / last cell) |
| <kbd>PageUp</kbd> / <kbd>PageDown</kbd> | Move by a viewport page |
| <kbd>Ctrl/⌘</kbd>+<kbd>A</kbd> / <kbd>C</kbd> / <kbd>V</kbd> | Select all / copy (TSV) / paste |
| <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Y</kbd> | Undo / redo |
| <kbd>Enter</kbd> / printable key | Edit the focused cell (type-to-edit seeds it) |
| <kbd>Space</kbd> | Toggle row selection (with `rowSelection`) |
| <kbd>Alt</kbd>+<kbd>↓</kbd> | Open the column menu (sort / **filter** / pin / autosize / hide) |
| <kbd>ContextMenu</kbd> / <kbd>Shift</kbd>+<kbd>F10</kbd> | Open the row context menu |
| <kbd>Esc</kbd> | Clear the selection / close a menu |

Filtering is reachable from the keyboard via the column menu's **Filter…** item
(the header funnel is a pointer affordance only, by the grid pattern's single-tab-
stop design). Menus follow the APG menu pattern: focus moves into the menu on
open, <kbd>↑ ↓ Home End</kbd> move between items, <kbd>Enter</kbd> activates,
<kbd>Esc</kbd>/<kbd>Tab</kbd> close and **return focus** to the opener. No keyboard
traps.

## Focus visibility (2.4.7)

Every keyboard-reachable control renders a visible focus ring on `:focus-visible`
(headers, column/row menu items, pager, filter & columns panels, tree toggles,
expand toggles, links, the quick-filter box and the column tool toggle). Native
controls (checkboxes, date / number / search inputs, scrollbars) follow the theme
via `color-scheme` + `accent-color`, so they keep their platform focus rings.

## Contrast (1.4.3, 1.4.11)

Measured against the built-in presets (gzipped tokens in `theme.ts`):

| Pair | Dark | Light | AA target |
|------|------|-------|-----------|
| Body text on surface | ~13.8:1 | ~16:1 | 4.5:1 |
| Dim/secondary text on surface | ~5.0:1 | ~4.8:1 | 4.5:1 |
| Focus ring vs surface | ~3.9:1 | ~3.3:1 | 3:1 (non-text) |

Both presets pass AA for body and secondary text and the 3:1 non-text threshold
for the focus indicator. Custom themes are the consumer's responsibility — keep
text/`textDim` ≥ 4.5:1 against `bg`/`rowA`/`rowB`, and `selBorder` ≥ 3:1.

## Motion (2.3.3)

All keyframe animations (cell flash, loading spinner, skeleton shimmer) are
disabled under `@media (prefers-reduced-motion: reduce)`. Held flashes
(`flashMotion: 'hold'`) are static tints, not animations, but follow the same
rule: no flash under reduced motion.

## Status messages (4.1.3)

The loading overlay is an `aria-live="polite"` region with `aria-busy`.

## Known limitations

- **Headers are individually tabbable** (each a focusable column header) rather than a single
  roving tab stop — fully keyboard-operable, just more tab stops on very wide
  grids. Use `Alt`+`↓` for per-column actions to avoid tabbing.
- axe-core on every grid in the demo reports no ARIA-structure violations. Two
  findings remain, both understood:
  - `scrollable-region-focusable` on the body's scroll container. It is not
    a tab stop of its own by design. The grid is the single tab stop, and
    the arrow keys, Page Up / Down and Home / End move the active cell and
    scroll it into view.
  - Colour contrast of `bo-grid/trading`'s default ceiling tone (`#c026d3`) on
    dark themes (3.85:1). Pass your own colours to `toneColor` until the
    defaults gain a dark-theme palette.
- A formal screen-reader pass (NVDA / VoiceOver) is recommended for any specific
  deployment; this audit is code-level.

Found an issue? Please open one — accessibility regressions are treated as bugs.
