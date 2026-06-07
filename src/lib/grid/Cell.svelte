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

  // Avatar initials: first letters of the first two words.
  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

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
  // Alignment kind: numbers right-align (tabular); sparkline + text-like rich
  // types (tags/badge/boolean/avatar) left-align.
  const kind = $derived(col.type === 'sparkline' ? 'spark' : isNumeric(col) ? 'num' : 'text');
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
  {:else if col.type === 'progress'}
    {@const lo = col.min ?? 0}
    {@const pct = Math.max(0, Math.min(100, (((Number(value) || 0) - lo) / (((col.max ?? 100) - lo) || 1)) * 100))}
    <span class="bo-progress" title={String(value ?? '')}>
      <span class="bo-progress-fill" style="width:{pct}%"></span>
    </span>
  {:else if col.type === 'rating'}
    {@const rmax = col.max ?? 5}
    {@const r = Math.max(0, Math.min(rmax, Math.round(Number(value) || 0)))}
    <span class="bo-rating" aria-label="{r} out of {rmax}">
      <span class="bo-stars-on">{'★'.repeat(r)}</span><span class="bo-stars-off">{'★'.repeat(rmax - r)}</span>
    </span>
  {:else if col.type === 'tags'}
    {@const tags = Array.isArray(value) ? value : String(value ?? '').split(',').map((s) => s.trim()).filter(Boolean)}
    <span class="bo-tags">{#each tags as t (t)}<span class="bo-tag">{t}</span>{/each}</span>
  {:else if col.type === 'badge'}
    <span class="bo-badge bo-badge-{col.tones?.[String(value)] ?? 'neutral'}">{value ?? ''}</span>
  {:else if col.type === 'boolean'}
    {#if value}
      <span class="bo-bool bo-bool-yes">✓{#if col.trueLabel}&nbsp;{col.trueLabel}{/if}</span>
    {:else}
      <span class="bo-bool bo-bool-no">✕{#if col.falseLabel}&nbsp;{col.falseLabel}{/if}</span>
    {/if}
  {:else if col.type === 'avatar'}
    <span class="bo-avatar" aria-hidden="true">{initials(String(value ?? ''))}</span>
    <span class="bo-avatar-name">{value ?? ''}{#if col.sub}<em>{row[col.sub]}</em>{/if}</span>
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
    padding: 0 var(--bo-cell-pad, 8px);
    height: 100%;
    font-size: var(--bo-font-size, 13px);
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

  /* ---- Rich cell types (v0.9) — all colours from theme tokens ---- */
  .bo-progress {
    flex: 1;
    min-width: 36px;
    height: 6px;
    border-radius: 999px;
    background: var(--bo-row-hover);
    overflow: hidden;
  }
  .bo-progress-fill {
    display: block;
    height: 100%;
    background: var(--bo-up);
    border-radius: 999px;
  }
  .bo-rating {
    letter-spacing: 1px;
    white-space: nowrap;
  }
  .bo-stars-on {
    color: var(--bo-amber);
  }
  .bo-stars-off {
    color: var(--bo-border);
  }
  .bo-tags {
    display: flex;
    gap: 4px;
    overflow: hidden;
  }
  .bo-tag {
    padding: 1px 7px;
    font-size: 11px;
    color: var(--bo-text-dim);
    background: var(--bo-row-hover);
    border: 0.5px solid var(--bo-border);
    border-radius: 999px;
    white-space: nowrap;
  }
  .bo-badge {
    padding: 2px 9px;
    font-size: 11px;
    font-weight: 600;
    border-radius: 999px;
    white-space: nowrap;
  }
  .bo-badge-up {
    color: var(--bo-up);
    background: color-mix(in srgb, var(--bo-up) 15%, transparent);
  }
  .bo-badge-down {
    color: var(--bo-down);
    background: color-mix(in srgb, var(--bo-down) 15%, transparent);
  }
  .bo-badge-amber {
    color: var(--bo-amber);
    background: color-mix(in srgb, var(--bo-amber) 15%, transparent);
  }
  .bo-badge-info {
    color: var(--bo-sel-border);
    background: color-mix(in srgb, var(--bo-sel-border) 15%, transparent);
  }
  .bo-badge-neutral {
    color: var(--bo-text-dim);
    background: var(--bo-row-hover);
  }
  .bo-bool-yes {
    color: var(--bo-up);
    font-weight: 600;
  }
  .bo-bool-no {
    color: var(--bo-text-dim);
  }
  .bo-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    font-size: 9px;
    font-weight: 700;
    color: var(--bo-bg);
    background: var(--bo-text-dim);
    border-radius: 50%;
  }
  .bo-avatar-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bo-avatar-name em {
    margin-left: 6px;
    font-style: normal;
    font-size: 11px;
    color: var(--bo-text-dim);
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
