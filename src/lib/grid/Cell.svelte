<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ColumnDef, GridRow } from './column';
  import { formatCell, colStyle, candlesOf } from './column';
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
    pinLeft = 0,
    width,
    alt = false,
    editing = false,
    colIndex,
    cellId,
    cellSnippet,
    onCellDown,
    onCellEnter,
    onCellDblClick,
    onEditCommit,
    onEditCancel,
  }: {
    col: ColumnDef;
    row: GridRow;
    r: number;
    c: number;
    selected?: boolean;
    focused?: boolean;
    pinned?: boolean;
    pinLeft?: number;
    /** Fixed pixel width (pinned/horizontal-scroll mode). */
    width?: number;
    alt?: boolean;
    editing?: boolean;
    colIndex?: number;
    cellId?: string;
    cellSnippet?: Snippet<[{ row: GridRow; column: ColumnDef; value: unknown }]>;
    onCellDown?: (r: number, c: number, e: PointerEvent) => void;
    onCellEnter?: (r: number, c: number, e: PointerEvent) => void;
    onCellDblClick?: (r: number, c: number) => void;
    onEditCommit?: (raw: string) => void;
    onEditCancel?: () => void;
  } = $props();

  let cancelled = false;
  function focusSelect(node: HTMLInputElement) {
    node.focus();
    node.select();
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
  const kind = $derived(col.type === 'text' ? 'text' : col.type === 'sparkline' ? 'spark' : 'num');

  function cellStyle(): string {
    let s = width != null ? `flex:0 0 ${width}px;width:${width}px;` : colStyle(col);
    if (col.type === 'heatmap') s += `background:${heatColor(Number(value), col.min, col.max)};`;
    if (pinned) {
      s += `position:sticky;left:${pinLeft}px;z-index:1;`;
      // Pinned cells must be opaque to cover scrolled content. Heatmap already
      // set a background; otherwise match the (alternating) row colour.
      if (col.type !== 'heatmap') s += `background:var(${alt ? '--bo-row-a' : '--bo-row-b'});`;
    }
    return s;
  }
</script>

<span
  class="c {kind}"
  class:dim={col.type === 'volume'}
  class:pos={col.type === 'percent' && Number(value) >= 0}
  class:neg={col.type === 'percent' && Number(value) < 0}
  class:sel={selected}
  class:focus={focused}
  style={cellStyle()}
  role="gridcell"
  tabindex="-1"
  id={cellId}
  aria-colindex={colIndex}
  aria-selected={selected}
  onpointerdown={(e) => onCellDown?.(r, c, e)}
  onpointerenter={(e) => onCellEnter?.(r, c, e)}
  ondblclick={() => onCellDblClick?.(r, c)}
>
  {#if editing}
    <input
      class="bo-edit"
      value={String(value ?? '')}
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
    <strong>{formatCell(col, value)}</strong>{#if col.sub}<em>{row[col.sub]}</em>{/if}
  {:else if col.flash}
    {#key row.flashSeq}
      <span class="flash {row.flashDir}">{formatCell(col, value)}</span>
    {/key}
  {:else}
    {formatCell(col, value)}
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
