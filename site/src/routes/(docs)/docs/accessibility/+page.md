---
title: Accessibility
description: Grid and treegrid semantics with true row and column counts, a full keyboard model, visible focus and WCAG 2.1 AA contrast.
---

<script>
  import Example from '$lib/Example.svelte';
  import Props from '$lib/Props.svelte';
</script>

bo-grid follows the ARIA grid pattern and targets **WCAG 2.1 AA**. Rows are virtualized, so only a window of them is in the page at any time; the grid reports the full size and every row's real position, so a screen reader is not misled by the window.

Try it with the keyboard only: <kbd>Tab</kbd> into the grid, move with the arrows, tick a row with <kbd>Space</kbd>, and open the column menu with <kbd>Alt</kbd>+<kbd>↓</kbd> (its **Filter…** item filters the column).

<Example name="accessibility" title="Keyboard only" />

## Give the grid a name

Set `ariaLabel` so the grid has an accessible name ("Watchlist", "Open orders"):

```svelte
<Grid {rows} {columns} height={480} ariaLabel="Open orders" />
```

## Roles and states

- The grid is `role="grid"` (`role="treegrid"` with tree data), with `aria-rowcount` and `aria-colcount` giving the full size, not the rendered window, and `aria-multiselectable` while range selection is on. It holds only rows; the toolbar, pager and menus sit beside it.
- Rows are `role="row"` with `aria-rowindex`, and `aria-selected` when rows can be selected (`rowSelection` or `selectedRowId`, below). Cells are `role="gridcell"` with `aria-colindex`, and `aria-selected` while `cellSelection` is on. Headers are `role="columnheader"` with `aria-sort`.
- The focused cell is announced through `aria-activedescendant`, so assistive technology follows it as it moves. The grid has one as soon as it takes focus (the last cell used, or the first cell of the top row in view), so Enter and Space work straight after Tab.
- Tree rows carry `aria-level` and `aria-expanded`; the row-number column, and a column with `rowHeader`, are made of row headers.
- Sparkline cells have a text label; copies of rows drawn for sticky headers or while loading are `aria-hidden`; the selection's totals bar and the find bar's match count are live regions.

## Name each row

Mark the column that names a row (a symbol, a market) with `rowHeader: true`. Its cells become row headers, so a screen reader moving along a row to a price also says which market it belongs to. They take focus and selection like any cell:

```ts
{ type: 'text', key: 'symbol', header: 'Symbol', pinned: 'left', rowHeader: true }
```

## Say which row is selected

The row `selectedRowId` marks (the one whose details the page shows) is not only a colour: it has `aria-selected="true"` and the other rows `"false"`, so a screen reader says it is selected. With `rowSelection` on, `aria-selected` follows the checkboxes instead, and the `selectedRowId` row has `aria-current="true"`.

## Hide a header from sight

A column of row actions (edit or delete buttons) needs no visible title, but its header still needs a name. Give it a `header` and `headerHidden: true`: the text is hidden from sight and kept for screen readers, and the column menu and the columns panel still show it.

```ts
{ type: 'text', key: 'edit', header: 'Edit', headerHidden: true, width: 40, sortable: false }
```

## Keyboard

The grid is a single tab stop with arrow-key navigation inside it. Everything works from the keyboard: editing, selection, copy and paste, the column menu (<kbd>Alt</kbd>+<kbd>↓</kbd>), the row menu (<kbd>Shift</kbd>+<kbd>F10</kbd>), and filtering through the column menu's **Filter…** item. Menus move focus in when they open and give it back when they close, and there are no keyboard traps. The full map is in [Keyboard & hotkeys](../keyboard/).

## Focus, contrast and motion

- Every control that takes focus shows a visible `:focus-visible` ring: headers, menu items, the pager, filter and column panels, tree and detail toggles.
- The built-in themes meet AA contrast for text and for interface parts; the high-contrast presets go well beyond it. See [Theming](../theming/).
- Flashes and other animations respect `prefers-reduced-motion`.
- Every string the grid writes, accessible names included, can be translated; see [Localization](../localization/).

The full audit (keyboard map, roles, measured contrast ratios and conformance notes) is in [ACCESSIBILITY.md](https://github.com/bonguynvan/bo-grid/blob/main/ACCESSIBILITY.md).

## Reference

<Props names={['ariaLabel', 'selectedRowId', 'labels', 'hotkeys']} />

<Props of="column" names={['rowHeader', 'headerHidden']} />
