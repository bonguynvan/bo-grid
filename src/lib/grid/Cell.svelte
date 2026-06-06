<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ColumnDef, GridRow } from './column';
  import { formatCell, colStyle, candlesOf, isNumeric } from './column';
  import { heatColor } from './heatmap';
  import Sparkline from '../sparkline/Sparkline.svelte';

  let {
    col,
    row,
    r,
    c,
    selected = false,
    focused = false,
    pinned = false,
    pinSide = 'left',
    pinOffset = 0,
    width,
    alt = false,
    editing = false,
    seed = null,
    fillCorner = false,
    fillpreview = false,
    colIndex,
    cellId,
    cellSnippet,
    tree,
    dragHandle,
    onCellDown,
    onCellEnter,
    onCellClick,
    onCellDblClick,
    onEditCommit,
    onEditCancel,
    onFillStart,
  }: {
    col: ColumnDef;
    row: GridRow;
    r: number;
    c: number;
    selected?: boolean;
    focused?: boolean;
    pinned?: boolean;
    pinSide?: 'left' | 'right';
    pinOffset?: number;
    /** Fixed pixel width (pinned/horizontal-scroll mode). */
    width?: number;
    alt?: boolean;
    editing?: boolean;
    /** Type-to-edit seed: when set, the editor opens pre-filled with this string
        (the character that triggered the edit) instead of the current value. */
    seed?: string | null;
    /** Show the fill handle (this cell is the selection's bottom-right corner). */
    fillCorner?: boolean;
    /** This cell is inside the in-progress fill drag's preview range. */
    fillpreview?: boolean;
    colIndex?: number;
    cellId?: string;
    cellSnippet?: Snippet<[{ row: GridRow; column: ColumnDef; value: unknown }]>;
    /** Tree-data gutter for the first column: indent + expand chevron. */
    tree?: { depth: number; hasChildren: boolean; expanded: boolean; onToggle: () => void };
    /** Drag-to-reorder handle for the first column (HTML5 draggable grip). */
    dragHandle?: { onStart: () => void; onEnd: () => void };
    onCellDown?: (r: number, c: number, e: PointerEvent) => void;
    onCellEnter?: (r: number, c: number, e: PointerEvent) => void;
    onCellClick?: (r: number, c: number, e: MouseEvent) => void;
    onCellDblClick?: (r: number, c: number) => void;
    onEditCommit?: (raw: string) => void;
    onEditCancel?: () => void;
    onFillStart?: () => void;
  } = $props();

  let cancelled = false;
  function focusSelect(node: HTMLInputElement) {
    node.focus();
    // Only text/search inputs support text selection; number/date inputs throw.
    if (node.type !== 'text' && node.type !== 'search') return;
    // Type-to-edit: keep the seeded character and put the caret after it;
    // otherwise select the whole value so the next keystroke replaces it.
    if (seed != null) node.setSelectionRange(node.value.length, node.value.length);
    else node.select();
  }
  function focusEl(node: HTMLElement) {
    node.focus();
  }
  function onEditKey(e: KeyboardEvent) {
    e.stopPropagation(); // keep arrows/Enter in the input, not the grid
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
    else if (e.key === 'Escape') {
      cancelled = true;
      (e.currentTarget as HTMLInputElement).blur();
    }
  }
  function onEditBlur(e: FocusEvent) {
    const v = (e.currentTarget as HTMLInputElement).value;
    if (cancelled) {
      cancelled = false;
      onEditCancel?.();
    } else {
      onEditCommit?.(v);
    }
  }

  // Dynamic field read. row is a runes class instance, so row[col.key] still
  // goes through the $state getter — fine-grained reactivity is preserved even
  // though the key is only known at runtime.
  const value = $derived(row[col.key]);
  // Typed inline editor: date columns edit with a date picker, numeric columns
  // with a numeric input; everything else stays a text input.
  const editorType = $derived(col.type === 'date' ? 'date' : isNumeric(col) ? 'number' : 'text');
  const editorValue = $derived(
    col.type === 'date' && Number.isFinite(Number(value))
      ? new Date(Number(value)).toISOString().slice(0, 10)
      : String(value ?? ''),
  );
  const kind = $derived(col.type === 'text' ? 'text' : col.type === 'sparkline' ? 'spark' : 'num');
  // Optional per-column cell class (static string or value/row function).
  const extraClass = $derived(
    typeof col.cellClass === 'function' ? (col.cellClass(value, row) ?? '') : (col.cellClass ?? ''),
  );
  // Native tooltip of the full value (opt-in via column `tooltip`).
  const tip = $derived(
    col.tooltip && col.type !== 'sparkline' && col.type !== 'custom'
      ? formatCell(col, value, row)
      : undefined,
  );

  function cellStyle(): string {
    let s = width != null ? `flex:0 0 ${width}px;width:${width}px;` : colStyle(col);
    if (col.type === 'heatmap') s += `background:${heatColor(Number(value), col.min, col.max)};`;
    if (pinned) {
      s += `position:sticky;${pinSide}:${pinOffset}px;z-index:1;`;
      // Pinned cells must be opaque to cover scrolled content. Heatmap already
      // set a background; otherwise match the (alternating) row colour.
      if (col.type !== 'heatmap') s += `background:var(${alt ? '--bo-row-a' : '--bo-row-b'});`;
    }
    return s;
  }
</script>

<!-- Keyboard interaction is handled at the grid level (arrow nav via aria-activedescendant + Enter); this cell click is a pointer affordance. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<span
  class="c {kind} {extraClass}"
  class:dim={col.type === 'volume'}
  class:pos={col.type === 'percent' && Number(value) >= 0}
  class:neg={col.type === 'percent' && Number(value) < 0}
  class:sel={selected}
  class:focus={focused}
  class:fillpreview={fillpreview}
  style={cellStyle()}
  role="gridcell"
  tabindex="-1"
  id={cellId}
  title={tip}
  aria-colindex={colIndex}
  aria-selected={selected}
  onpointerdown={(e) => onCellDown?.(r, c, e)}
  onpointerenter={(e) => onCellEnter?.(r, c, e)}
  onclick={(e) => onCellClick?.(r, c, e)}
  ondblclick={() => onCellDblClick?.(r, c)}
>
  {#if dragHandle}
    <span
      class="drag-handle"
      role="button"
      tabindex="-1"
      aria-label="Drag to reorder row"
      draggable="true"
      onpointerdown={(e) => e.stopPropagation()}
      ondragstart={() => dragHandle.onStart()}
      ondragend={() => dragHandle.onEnd()}
    >⠿</span>
  {/if}
  {#if tree}
    <span class="tree-gutter" style="padding-left:{tree.depth * 16}px">
      {#if tree.hasChildren}
        <button
          class="tree-toggle"
          type="button"
          aria-expanded={tree.expanded}
          aria-label="Toggle children"
          onpointerdown={(e) => e.stopPropagation()}
          onclick={(e) => {
            e.stopPropagation();
            tree.onToggle();
          }}
        >
          {tree.expanded ? '▾' : '▸'}
        </button>
      {:else}
        <span class="tree-leaf"></span>
      {/if}
    </span>
  {/if}
  {#if editing && col.options && col.options.length > 0}
    <select
      class="bo-edit"
      value={String(value ?? '')}
      use:focusEl
      onkeydown={onEditKey}
      onblur={onEditBlur}
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => e.stopPropagation()}
    >
      {#each col.options as opt (opt)}
        <option value={opt}>{opt}</option>
      {/each}
    </select>
  {:else if editing}
    <input
      class="bo-edit"
      type={editorType}
      value={seed ?? editorValue}
      use:focusSelect
      onkeydown={onEditKey}
      onblur={onEditBlur}
      onpointerdown={(e) => e.stopPropagation()}
      onclick={(e) => e.stopPropagation()}
      ondblclick={(e) => e.stopPropagation()}
    />
  {:else if col.type === 'custom'}
    {#if cellSnippet}{@render cellSnippet({ row, column: col, value })}{:else}{value ?? ''}{/if}
  {:else if col.type === 'sparkline'}
    <Sparkline candles={candlesOf(row, col.sparkKey)} />
  {:else if col.type === 'text'}
    <strong>{formatCell(col, value, row)}</strong>{#if col.sub}<em>{row[col.sub]}</em>{/if}
  {:else if col.flash}
    {#key row.flashSeq}
      <span class="flash {row.flashDir}">{formatCell(col, value, row)}</span>
    {/key}
  {:else}
    {formatCell(col, value, row)}
  {/if}
  {#if fillCorner}
    <span
      class="fill-handle"
      role="button"
      tabindex="-1"
      aria-label="Fill"
      onpointerdown={(e) => {
        e.stopPropagation();
        onFillStart?.();
      }}
    ></span>
  {/if}
</span>

<style>
  .c {
    position: relative;
    display: flex;
    align-items: center;
    padding: 0 8px;
    height: 100%;
    font-size: 13px;
    line-height: 1.4;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .num {
    justify-content: flex-end;
    font-family: var(--bo-mono);
    font-variant-numeric: tabular-nums;
  }
  .text {
    gap: 6px;
  }
  .text strong {
    font-family: var(--bo-mono);
    font-weight: 600;
  }
  .text em {
    font-style: normal;
    font-size: 10px;
    color: var(--bo-text-dim);
  }
  .spark {
    overflow: visible;
  }
  /* Tree-data gutter: indent + expand chevron, before the cell content. */
  .tree-gutter {
    display: inline-flex;
    align-items: center;
    flex: none;
  }
  .tree-toggle {
    width: 18px;
    height: 18px;
    padding: 0;
    font-size: 10px;
    line-height: 1;
    color: var(--bo-text-dim);
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  .tree-toggle:hover {
    color: var(--bo-text);
    background: var(--bo-row-hover);
  }
  .tree-leaf {
    display: inline-block;
    width: 18px;
  }
  .drag-handle {
    flex: none;
    margin-right: 4px;
    font-size: 12px;
    line-height: 1;
    color: var(--bo-text-dim);
    cursor: grab;
    user-select: none;
  }
  .drag-handle:active {
    cursor: grabbing;
  }
  .bo-edit {
    width: 100%;
    height: 100%;
    padding: 0 7px;
    font: inherit;
    font-family: var(--bo-mono);
    font-size: 13px;
    text-align: inherit;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 1px solid var(--bo-sel-border);
    outline: none;
  }
  .dim {
    color: var(--bo-text-dim);
  }
  .pos {
    color: var(--bo-up);
  }
  .neg {
    color: var(--bo-down);
  }

  /* Selection: a translucent fill layered via inset box-shadow so it tints even
     over a heatmap background; the focus cell gets a 1px ring on top. */
  .c.sel {
    box-shadow: inset 0 0 0 1000px var(--bo-sel-fill);
  }
  .c.focus {
    box-shadow:
      inset 0 0 0 1000px var(--bo-sel-fill),
      inset 0 0 0 1px var(--bo-sel-border);
  }
  /* Fill: a draggable square at the selection's corner + the drag preview. */
  .fill-handle {
    position: absolute;
    right: -3px;
    bottom: -3px;
    width: 7px;
    height: 7px;
    background: var(--bo-sel-border);
    border: 1px solid var(--bo-bg);
    cursor: crosshair;
    z-index: 4;
    touch-action: none;
  }
  .c.fillpreview {
    box-shadow: inset 0 0 0 1px var(--bo-sel-border);
  }

  .flash {
    animation: flash 0.3s linear;
  }
  .flash.up {
    color: var(--bo-up);
  }
  .flash.down {
    color: var(--bo-down);
  }
  @keyframes flash {
    0% {
      background: color-mix(in srgb, var(--bo-amber) 38%, transparent);
    }
    100% {
      background: transparent;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .flash {
      animation: none;
    }
  }
</style>
