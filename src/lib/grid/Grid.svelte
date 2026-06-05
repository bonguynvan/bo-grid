<script lang="ts">
  import { untrack } from 'svelte';
  import type { ColumnDef, GridRow, SortState, CellEditEvent } from './column';
  import { colStyle, isNumeric, isSortable, isEditable, compareRows, formatCell } from './column';
  import { arrangePinned } from './pin';
  import { uniformHeights, variableHeights } from './rowheight';
  import { themeVars, lightTheme, type GridTheme } from './theme';
  import { Selection } from './selection.svelte';
  import { aggregate, type AggKind, type AggResult } from './aggregate';
  import { buildFlatRows, activeGroupsAt, type VisualRow, type GroupNode } from './grouping';
  import { moveIndex } from './reorder';
  import type { RowSource } from './source';
  import { RowSourceController } from './source.svelte';
  import Cell from './Cell.svelte';
  import GroupRow from './GroupRow.svelte';
  import AggregationBar from './AggregationBar.svelte';

  let {
    rows,
    columns,
    height,
    filter = '',
    groupBy = [],
    aggregations = ['sum', 'avg', 'count', 'min', 'max'],
    persistKey,
    source,
    onCellEdit,
    rowHeight,
    theme,
  }: {
    rows: GridRow[];
    columns: ColumnDef[];
    height: number;
    /** Row height in px (uniform), or a function for variable heights
        (in-memory mode only). Default 36. */
    rowHeight?: number | ((row: GridRow, index: number) => number);
    /** Built-in theme name or a custom token map. Default 'dark'. */
    theme?: 'dark' | 'light' | GridTheme;
    filter?: string;
    groupBy?: string[];
    aggregations?: AggKind[];
    persistKey?: string;
    /** Back the grid with a windowed/server data source instead of `rows`.
        In source mode, sort + filter are delegated to the source; grouping is
        not applied. */
    source?: RowSource;
    /** Called when an editable cell is committed. Update your row data in here. */
    onCellEdit?: (e: CellEditEvent) => void;
  } = $props();

  const ROW_H = 36;
  const OVERSCAN = 6;

  let scrollTop = $state(0);
  let sortState = $state<SortState | null>(null);
  let gridEl: HTMLDivElement;
  let viewportEl: HTMLDivElement;
  let headEl: HTMLDivElement;

  const sel = new Selection();
  let dragging = $state(false);
  let editing = $state<{ r: number; c: number } | null>(null);

  function startEdit(r: number, c: number) {
    if (!isEditable(cols[c]) || !dataAt(r)) return;
    editing = { r, c };
  }
  function commitEdit(r: number, c: number, raw: string) {
    const col = cols[c];
    const row = dataAt(r);
    editing = null;
    if (!row) return;
    let value: string | number = raw;
    if (isNumeric(col)) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return; // reject invalid number, keep old value
      value = n;
    }
    onCellEdit?.({ row, column: col, value });
  }

  const collapsed = new Set<string>();
  let collapsedVersion = $state(0);

  // Column order (indices into `columns`); reordered by header drag-and-drop.
  let order = $state<number[]>([]);
  let dragSrc = $state(-1);
  let dragOver = $state(-1);

  const ordered = $derived(order.length === columns.length ? order.map((i) => columns[i]) : columns);
  // Pin-arrangement: pinned columns move to the front and get sticky offsets.
  // When nothing is pinned this is a no-op and the grid stays fit-to-width.
  const layout = $derived(arrangePinned(ordered));
  const cols = $derived(layout.columns);
  const pinned = $derived(layout.anyPinned);

  // Theme → inline `--bo-grid-*` overrides. 'dark' uses the built-in defaults.
  const themeStyle = $derived(
    !theme || theme === 'dark' ? '' : themeVars(theme === 'light' ? lightTheme : theme),
  );

  function headStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `position:sticky;left:${inf.left}px;z-index:5;background:var(--bo-header-bg);`;
    return s;
  }
  function cellWidthStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `position:sticky;left:${inf.left}px;z-index:1;background:var(--bo-bg);`;
    return s;
  }

  // Windowed data source controller (only in source mode).
  const controller = $derived(source ? new RowSourceController(source) : null);

  function orderStorageKey(): string | null {
    return persistKey ? `bo-grid:order:${persistKey}` : null;
  }

  $effect(() => {
    columns;
    untrack(() => {
      const base = columns.map((_, i) => i);
      const key = orderStorageKey();
      if (key && typeof localStorage !== 'undefined') {
        try {
          const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
          if (Array.isArray(saved) && saved.length === base.length && base.every((i) => saved.includes(i))) {
            order = saved;
            return;
          }
        } catch {
          /* corrupt value — fall through to default */
        }
      }
      order = base;
    });
  });

  function moveColumn(from: number, to: number) {
    const next = moveIndex(order, from, to);
    if (next === order) return;
    order = next;
    sel.clear();
    editing = null;
    const key = orderStorageKey();
    if (key && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable — order still applies this session */
      }
    }
  }

  function toggleSort(col: ColumnDef) {
    if (!isSortable(col)) return;
    if (!sortState || sortState.key !== col.key) sortState = { key: col.key, dir: 'asc' };
    else if (sortState.dir === 'asc') sortState = { key: col.key, dir: 'desc' };
    else sortState = null;
  }

  // In-memory pipeline (skipped entirely in source mode).
  const view = $derived.by(() => {
    if (source) return [] as GridRow[];
    const base = rows;
    const allCols = columns;
    const f = filter.trim().toLowerCase();
    const s = sortState;
    return untrack(() => {
      let r = base;
      if (f) r = r.filter((row) => allCols.some((c) => String(row[c.key] ?? '').toLowerCase().includes(f)));
      if (s) r = [...r].sort((a, b) => compareRows(a, b, s));
      return r;
    });
  });

  const flat = $derived.by<VisualRow[]>(() => {
    const v = view;
    const gb = groupBy;
    collapsedVersion;
    return untrack(() => buildFlatRows(v, gb, collapsed));
  });

  // Unified row count: from the source total or the flattened in-memory list.
  const rowCount = $derived(source ? (controller?.total ?? 0) : flat.length);

  const maxR = $derived(rowCount - 1);
  const maxC = $derived(cols.length - 1);

  // Row-height model. Uniform (O(1)) by default; a function rowHeight switches to
  // a prefix-sum model (in-memory only — source mode can't know unloaded heights).
  const baseH = $derived(typeof rowHeight === 'number' && rowHeight > 0 ? rowHeight : ROW_H);
  const variable = $derived(typeof rowHeight === 'function' && !source);
  const heights = $derived.by<number[] | null>(() => {
    if (!variable) return null;
    const fn = rowHeight as (row: GridRow, index: number) => number;
    const arr = new Array<number>(flat.length);
    let di = 0;
    for (let i = 0; i < flat.length; i++) {
      const it = flat[i];
      arr[i] = it.kind === 'data' ? Math.max(1, fn(it.row, di++)) : baseH;
    }
    return arr;
  });
  const hm = $derived(variable && heights ? variableHeights(heights) : uniformHeights(rowCount, baseH));

  const total = $derived(hm.total);
  const rowWidthStyle = $derived(pinned ? `width:${layout.totalWidth}px;right:auto;` : '');
  const visibleCount = $derived(Math.ceil(height / baseH) + OVERSCAN * 2);
  const start = $derived(Math.max(0, hm.indexAt(scrollTop) - OVERSCAN));
  const renderEnd = $derived(
    source
      ? (controller && controller.total > 0 ? Math.min(start + visibleCount, controller.total) : start + visibleCount)
      : Math.min(flat.length, hm.indexAt(scrollTop + height) + OVERSCAN + 1),
  );

  type RenderItem =
    | { vr: number; kind: 'group'; group: GroupNode }
    | { vr: number; kind: 'data'; row: GridRow }
    | { vr: number; kind: 'skeleton' };

  const renderItems = $derived.by<RenderItem[]>(() => {
    const out: RenderItem[] = [];
    if (source && controller) {
      controller.version; // track cache updates
      for (let vr = start; vr < renderEnd; vr++) {
        const row = controller.rowAt(vr);
        out.push(row ? { vr, kind: 'data', row } : { vr, kind: 'skeleton' });
      }
    } else {
      for (let vr = start; vr < renderEnd; vr++) {
        const item = flat[vr];
        if (!item) continue;
        if (item.kind === 'group') out.push({ vr, kind: 'group', group: item.group });
        else out.push({ vr, kind: 'data', row: item.row });
      }
    }
    return out;
  });

  const stickyGroups = $derived(
    !source && groupBy.length > 0 ? activeGroupsAt(flat, hm.indexAt(scrollTop)) : [],
  );

  // Fetch the visible window whenever it, the sort, or the filter changes.
  $effect(() => {
    const ctrl = controller;
    if (!ctrl) return;
    const range = { start, end: start + visibleCount };
    const s = sortState;
    const f = filter;
    void ctrl.fetch(range, s, f);
  });

  function dataAt(r: number): GridRow | null {
    if (source && controller) return controller.rowAt(r);
    const item = flat[r];
    return item && item.kind === 'data' ? item.row : null;
  }

  const agg = $derived.by<AggResult | null>(() => {
    const b = sel.bounds;
    if (!b || sel.count <= 1) return null;
    const vals: number[] = [];
    const rEnd = Math.min(b.r1, rowCount - 1);
    const cEnd = Math.min(b.c1, cols.length - 1);
    for (let r = b.r0; r <= rEnd; r++) {
      const row = dataAt(r);
      if (!row) continue;
      for (let c = b.c0; c <= cEnd; c++) {
        if (!isNumeric(cols[c])) continue;
        const v = Number(row[cols[c].key]);
        if (Number.isFinite(v)) vals.push(v);
      }
    }
    return aggregate(vals);
  });

  function onScroll(e: Event) {
    const el = e.currentTarget as HTMLElement;
    scrollTop = el.scrollTop;
    if (pinned && headEl) headEl.scrollLeft = el.scrollLeft; // keep header in sync
  }

  function toggleGroup(path: string) {
    if (collapsed.has(path)) collapsed.delete(path);
    else collapsed.add(path);
    collapsedVersion++;
    sel.clear();
  }

  function onCellDown(r: number, c: number, e: PointerEvent) {
    if (e.button !== 0) return;
    e.preventDefault();
    gridEl?.focus();
    if (e.shiftKey) sel.extendTo(r, c);
    else sel.start(r, c);
    dragging = true;
  }

  function onCellEnter(r: number, c: number) {
    if (dragging) sel.extendTo(r, c);
  }

  function scrollFocusIntoView() {
    const f = sel.focus;
    if (!f || !viewportEl) return;
    const top = hm.offsetOf(f.r);
    const h = hm.heightOf(f.r);
    if (top < viewportEl.scrollTop) viewportEl.scrollTop = top;
    else if (top + h > viewportEl.scrollTop + height) viewportEl.scrollTop = top + h - height;
  }

  async function copySelection() {
    const b = sel.bounds;
    if (!b) return;
    const lines: string[] = [];
    const rEnd = Math.min(b.r1, rowCount - 1);
    const cEnd = Math.min(b.c1, cols.length - 1);
    for (let r = b.r0; r <= rEnd; r++) {
      const row = dataAt(r);
      if (!row) continue;
      const cells: string[] = [];
      for (let c = b.c0; c <= cEnd; c++) {
        const col = cols[c];
        cells.push(col.type === 'sparkline' ? '' : formatCell(col, row[col.key]));
      }
      lines.push(cells.join('\t'));
    }
    try {
      await navigator.clipboard?.writeText(lines.join('\n'));
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  function onKeydown(e: KeyboardEvent) {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Enter' && sel.focus && !editing) {
      const f = sel.focus;
      if (isEditable(cols[f.c])) {
        e.preventDefault();
        startEdit(f.r, f.c);
        return;
      }
    }
    if (mod && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      sel.selectAll(rowCount, cols.length);
      return;
    }
    if (mod && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      void copySelection();
      return;
    }
    if (e.key === 'Escape') {
      sel.clear();
      return;
    }
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const d = delta[e.key];
    if (d) {
      e.preventDefault();
      sel.move(d[0], d[1], e.shiftKey, maxR, maxC);
      scrollFocusIntoView();
    }
  }

  $effect(() => {
    const up = () => (dragging = false);
    window.addEventListener('pointerup', up);
    return () => window.removeEventListener('pointerup', up);
  });

  // Positional selection: clear it whenever the row order/contents shift.
  $effect(() => {
    filter;
    sortState;
    collapsedVersion;
    source;
    untrack(() => {
      sel.clear();
      editing = null;
    });
  });
</script>

<!-- `bo-grid` is an unscoped public class: a stable hook for consumer overrides. -->
<div class="bo-grid grid" role="grid" tabindex="0" style={themeStyle} bind:this={gridEl} onkeydown={onKeydown}>
  <div class="head" role="row" bind:this={headEl} style={pinned ? 'overflow:hidden;' : ''}>
    {#each cols as col, ci (ci)}
      <button
        class="h"
        class:right={isNumeric(col) || col.align === 'right'}
        class:sortable={isSortable(col)}
        class:dragging={ci === dragSrc}
        class:dragover={ci === dragOver && ci !== dragSrc}
        style={headStyle(ci)}
        type="button"
        role="columnheader"
        draggable="true"
        aria-sort={sortState?.key === col.key ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
        onclick={() => toggleSort(col)}
        ondragstart={(e) => {
          dragSrc = ci;
          e.dataTransfer?.setData('text/plain', String(ci));
        }}
        ondragover={(e) => {
          e.preventDefault();
          dragOver = ci;
        }}
        ondragleave={() => {
          if (dragOver === ci) dragOver = -1;
        }}
        ondrop={(e) => {
          e.preventDefault();
          moveColumn(dragSrc, ci);
          dragSrc = -1;
          dragOver = -1;
        }}
        ondragend={() => {
          dragSrc = -1;
          dragOver = -1;
        }}
      >
        <span class="label">{col.header}</span>
        {#if sortState?.key === col.key}
          <span class="ind">{sortState.dir === 'asc' ? '▲' : '▼'}</span>
        {/if}
      </button>
    {/each}
  </div>

  <div
    class="viewport"
    style="height:{height}px;{pinned ? 'overflow-x:auto;' : ''}"
    bind:this={viewportEl}
    onscroll={onScroll}
  >
    {#if rowCount === 0 && !controller?.loading}
      <div class="empty">No matching rows</div>
    {/if}
    {#if stickyGroups.length > 0}
      <div class="sticky">
        {#each stickyGroups as g (g.depth)}
          <div class="sticky-row" style="height:{baseH}px">
            <GroupRow group={g} columns={cols} onToggle={toggleGroup} />
          </div>
        {/each}
      </div>
    {/if}
    <div class="spacer" style="height:{total}px;{pinned ? `width:${layout.totalWidth}px;` : ''}">
      {#each renderItems as item (item.vr)}
        {#if item.kind === 'group'}
          <div class="grouprow" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            <GroupRow group={item.group} columns={cols} onToggle={toggleGroup} />
          </div>
        {:else if item.kind === 'skeleton'}
          <div class="row skeleton" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#each cols as col, ci (ci)}
              <span class="c" style={cellWidthStyle(ci)}><span class="skelbar"></span></span>
            {/each}
          </div>
        {:else}
          <div class="row" class:alt={item.vr % 2 === 1} role="row" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#each cols as col, ci (ci)}
              <Cell
                {col}
                row={item.row}
                r={item.vr}
                c={ci}
                selected={sel.contains(item.vr, ci)}
                focused={sel.isFocus(item.vr, ci)}
                pinned={pinned && layout.info[ci].pinned}
                pinLeft={layout.info[ci].left}
                width={pinned ? layout.info[ci].width : undefined}
                alt={item.vr % 2 === 1}
                editing={editing?.r === item.vr && editing?.c === ci}
                {onCellDown}
                {onCellEnter}
                onCellDblClick={startEdit}
                onEditCommit={(raw) => commitEdit(item.vr, ci, raw)}
                onEditCancel={() => (editing = null)}
              />
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  </div>

  <AggregationBar result={agg} kinds={aggregations} />
</div>

<style>
  .grid {
    --bo-bg: var(--bo-grid-bg, #1a1a1a);
    --bo-header-bg: var(--bo-grid-header-bg, #0f0f0f);
    --bo-row-a: var(--bo-grid-row-a, #131313);
    --bo-row-b: var(--bo-grid-row-b, #0f0f0f);
    --bo-row-hover: var(--bo-grid-row-hover, #1f1f24);
    --bo-text: var(--bo-grid-text, #e5e5e5);
    --bo-text-dim: var(--bo-grid-text-dim, #8a8a8a);
    --bo-border: var(--bo-grid-border, rgba(255, 255, 255, 0.06));
    --bo-up: var(--bo-grid-up, #34d399);
    --bo-down: var(--bo-grid-down, #f87171);
    --bo-amber: var(--bo-grid-amber, #f59e0b);
    --bo-sel-fill: var(--bo-grid-sel-fill, rgba(99, 102, 241, 0.16));
    --bo-sel-border: var(--bo-grid-sel-border, #6366f1);
    --bo-header-h: var(--bo-grid-header-h, 28px);
    --bo-mono: var(--bo-grid-mono, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace);
    --bo-sans: var(--bo-grid-sans, Inter, "Segoe UI", system-ui, sans-serif);

    display: flex;
    flex-direction: column;
    color: var(--bo-text);
    font-family: var(--bo-sans);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 8px;
    overflow: hidden;
    outline: none;
  }
  .grid:focus-visible {
    border-color: var(--bo-sel-border);
  }

  .head {
    display: flex;
    align-items: stretch;
    height: var(--bo-header-h);
    background: var(--bo-header-bg);
    border-bottom: 0.5px solid var(--bo-border);
  }
  .h {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 8px;
    min-width: 0;
    font: inherit;
    font-size: 11px;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: var(--bo-text-dim);
    background: transparent;
    border: 0;
    cursor: grab;
  }
  .h.sortable {
    cursor: pointer;
  }
  .h.sortable:hover {
    color: var(--bo-text);
    background: var(--bo-row-hover);
  }
  .h.dragging {
    opacity: 0.4;
  }
  .h.dragover {
    box-shadow: inset 2px 0 0 var(--bo-sel-border);
  }
  .h.right {
    justify-content: flex-end;
  }
  .h .label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    pointer-events: none;
  }
  .h .ind {
    font-size: 9px;
    color: var(--bo-text);
  }

  .viewport {
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;
  }
  .empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bo-text-dim);
    font-size: 13px;
  }
  .spacer {
    position: relative;
    width: 100%;
  }

  .sticky {
    position: sticky;
    top: 0;
    height: 0;
    z-index: 3;
    overflow: visible;
  }
  .sticky-row {
    position: relative;
    left: 0;
    right: 0;
  }
  .sticky-row:last-child {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.28);
  }

  .row,
  .grouprow {
    position: absolute;
    left: 0;
    right: 0;
  }
  .row {
    display: flex;
    align-items: stretch;
    background: var(--bo-row-b);
    border-bottom: 0.5px solid var(--bo-border);
  }
  .row.alt {
    background: var(--bo-row-a);
  }
  .row:not(.skeleton):hover {
    background: var(--bo-row-hover);
  }

  .skeleton .c {
    display: flex;
    align-items: center;
    padding: 0 8px;
  }
  .skelbar {
    width: 60%;
    height: 8px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--bo-row-hover), var(--bo-border), var(--bo-row-hover));
    background-size: 200% 100%;
    animation: shimmer 1.1s linear infinite;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .skelbar {
      animation: none;
    }
  }
</style>
