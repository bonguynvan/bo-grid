# Accessibility

bo-grid targets **WCAG 2.1 AA**. This document records the accessibility posture,
the keyboard model, and the conformance notes from the 0.15 audit.

## Roles & semantics (1.3.1, 4.1.2)

- The grid root is `role="grid"` with `aria-rowcount` / `aria-colcount` reflecting
  the **true** dataset size (not the virtualized window), an optional `ariaLabel`,
  and `aria-multiselectable` when range selection is on.
- Rows are `role="row"` with 1-based `aria-rowindex`; cells are `role="gridcell"`
  with `aria-colindex` and `aria-selected`. Off-screen virtualization duplicates
  are `aria-hidden`.
- Column headers are `role="columnheader"` with `aria-sort` (`ascending` /
  `descending` / `none`) kept in sync with the sort state.
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
disabled under `@media (prefers-reduced-motion: reduce)`.

## Status messages (4.1.3)

The loading overlay is an `aria-live="polite"` region with `aria-busy`.

## Known limitations

- **Headers are individually tabbable** (real `<button>`s) rather than a single
  roving tab stop — fully keyboard-operable, just more tab stops on very wide
  grids. Use `Alt`+`↓` for per-column actions to avoid tabbing.
- A formal screen-reader pass (NVDA / VoiceOver) and an automated axe-core sweep
  are recommended for any specific deployment; this audit is code-level.
- Charts (`bo-grid/charts`) expose `role="img"` with an `aria-label`; they are
  summary visuals, not data tables.

Found an issue? Please open one — accessibility regressions are treated as bugs.
