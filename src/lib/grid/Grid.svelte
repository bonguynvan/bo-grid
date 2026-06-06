<script module lang="ts">
  // Per-instance id counter, for stable ARIA ids (active-descendant).
  let uid = 0;
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { ColumnDef, GridRow, SortState, SortDir, CellEditEvent } from './column';
  import { colStyle, isNumeric, isSortable, isEditable, compareBySorts, formatCell } from './column';
  import { arrangePinned } from './pin';
  import { uniformHeights, variableHeights } from './rowheight';
  import { themeVars, lightTheme, type GridTheme } from './theme';
  import { Selection } from './selection.svelte';
  import { aggregate, type AggKind, type AggResult } from './aggregate';
  import { buildFlatRows, activeGroupsAt, type VisualRow, type GroupNode } from './grouping';
  import { moveIndex } from './reorder';
  import { parseClipboard, isSingleCell } from './clipboard';
  import { applyWidths, clampWidth, isResizable, type WidthMap } from './sizing';
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
    resizable = true,
    rowSelection = false,
    onRowSelectionChange,
    hiddenColumns = [],
    rowClass,
    onRowClick,
    sort,
    onSortChange,
    footer = false,
    cell,
  }: {
    rows: GridRow[];
    columns: ColumnDef[];
    height: number;
    /** Row height in px (uniform), or a function for variable heights
        (in-memory mode only). Default 36. */
    rowHeight?: number | ((row: GridRow, index: number) => number);
    /** Built-in theme name or a custom token map. Default 'dark'. */
    theme?: 'dark' | 'light' | GridTheme;
    /** Allow drag-to-resize column widths. Default true; opt out per column
        with `resizable: false`. */
    resizable?: boolean;
    /** Show a leading checkbox column for whole-row selection (keyed by row id,
        stable across sort/filter). Default false. */
    rowSelection?: boolean;
    /** Called with the selected row ids whenever the row-selection set changes. */
    onRowSelectionChange?: (selectedIds: number[]) => void;
    /** Column keys to hide (controlled). Build your own column-picker UI and
        drive this prop — the grid stays presentation-only. */
    hiddenColumns?: string[];
    /** Return extra CSS class(es) for a data row (e.g. to colour by value).
        Style them via `:global(.your-class)` since rows live inside the grid. */
    rowClass?: (row: GridRow) => string | undefined;
    /** Called when a data row is activated by click or Enter (open a detail
        view, navigate, …). Edit-input and checkbox clicks are excluded. */
    onRowClick?: (row: GridRow, event: MouseEvent | KeyboardEvent) => void;
    /** Controlled sort order (multi-key, primary first). When set, the grid
        reflects this and reports changes via `onSortChange` instead of holding
        its own state. Omit for uncontrolled sorting. */
    sort?: SortState[];
    /** Called with the new sort order whenever a header is clicked. */
    onSortChange?: (sort: SortState[]) => void;
    /** Show a pinned totals row: each column with a `groupAgg` shows that
        aggregate over all (filtered) rows. In-memory mode only. Default false. */
    footer?: boolean;
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
    /** Render content for `type: 'custom'` columns. */
    cell?: Snippet<[{ row: GridRow; column: ColumnDef; value: unknown }]>;
  } = $props();

  const ROW_H = 36;
  const OVERSCAN = 6;
  const gid = `bo-grid-${uid++}`;

  let scrollTop = $state(0);
  // Sort order, primary first. Empty = unsorted. Multiple keys via Shift-click.
  // Controlled by the `sort` prop when provided, else internal state.
  let internalSorts = $state<SortState[]>([]);
  const sorts = $derived(sort ?? internalSorts);
  function setSorts(next: SortState[]): void {
    if (sort === undefined) internalSorts = next; // uncontrolled: own the state
    onSortChange?.(next); // always notify (lets consumers observe/persist)
  }
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
  // Coerce + validate a raw string for cell (r,c) and emit onCellEdit.
  // Returns true if a value was written, false if rejected (not editable,
  // missing row, or invalid number). Shared by inline edit and paste.
  function writeCell(r: number, c: number, raw: string): boolean {
    const col = cols[c];
    if (!col || !isEditable(col)) return false;
    const row = dataAt(r);
    if (!row) return false;
    let value: string | number = raw;
    if (isNumeric(col)) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return false; // reject invalid number, keep old value
      value = n;
    }
    onCellEdit?.({ row, column: col, value });
    return true;
  }

  function commitEdit(r: number, c: number, raw: string) {
    editing = null;
    writeCell(r, c, raw);
  }

  const collapsed = new Set<string>();
  let collapsedVersion = $state(0);

  // Column order (indices into `columns`); reordered by header drag-and-drop.
  let order = $state<number[]>([]);
  let dragSrc = $state(-1);
  let dragOver = $state(-1);

  // User column-width overrides (drag-to-resize), keyed by column key.
  let widths = $state<WidthMap>({});

  // Whole-row selection (opt-in), keyed by row id so it survives sort/filter.
  // Plain Set + a version counter for reactivity (same pattern as `collapsed`).
  const SEL_W = 40; // checkbox column width (px)
  const selectedRows = new Set<number>();
  let selRowsVersion = $state(0);
  const selOffset = $derived(rowSelection ? 1 : 0);

  function isRowSelected(id: number): boolean {
    selRowsVersion; // track
    return selectedRows.has(id);
  }
  function toggleRow(id: number): void {
    if (selectedRows.has(id)) selectedRows.delete(id);
    else selectedRows.add(id);
    selRowsVersion++;
    onRowSelectionChange?.([...selectedRows]);
  }

  const ordered = $derived(order.length === columns.length ? order.map((i) => columns[i]) : columns);
  // Drop hidden columns (controlled via `hiddenColumns`). Applied after ordering
  // so `order` stays indexed over the full column set.
  const visible = $derived(
    hiddenColumns.length ? ordered.filter((c) => !hiddenColumns.includes(c.key)) : ordered,
  );
  // Apply any resize overrides (turns the dragged column fixed-width), then
  // pin-arrange. Both are no-ops by default, so the grid stays fit-to-width.
  const sized = $derived(applyWidths(visible, widths));
  // Pin-arrangement: pinned columns move to the front and get sticky offsets.
  // When nothing is pinned this is a no-op and the grid stays fit-to-width.
  const layout = $derived(arrangePinned(sized));
  const cols = $derived(layout.columns);
  const pinned = $derived(layout.anyPinned);

  // Theme → inline `--bo-grid-*` overrides. 'dark' uses the built-in defaults.
  const themeStyle = $derived(
    !theme || theme === 'dark' ? '' : themeVars(theme === 'light' ? lightTheme : theme),
  );

  // Screen readers track the active cell via aria-activedescendant (the focus
  // cell is always scrolled into view, so its element exists in the DOM).
  const activeId = $derived(sel.focus ? `${gid}-r${sel.focus.r}-c${sel.focus.c}` : undefined);

  // Pinned columns sit to the right of the (also-sticky) checkbox column, so
  // their sticky-left offsets shift by SEL_W when row selection is on.
  function headStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `position:sticky;left:${inf.left + selOffset * SEL_W}px;z-index:5;background:var(--bo-header-bg);`;
    return s;
  }
  function cellWidthStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `position:sticky;left:${inf.left + selOffset * SEL_W}px;z-index:1;background:var(--bo-bg);`;
    return s;
  }
  // The leading checkbox column: a fixed-width flex item, sticky-left when the
  // grid scrolls horizontally (pinned mode).
  function selCellStyle(header: boolean): string {
    let s = `flex:0 0 ${SEL_W}px;width:${SEL_W}px;`;
    if (pinned)
      s += `position:sticky;left:0;z-index:${header ? 6 : 2};background:var(--bo-${header ? 'header-bg' : 'bg'});`;
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

  // ---- Column resizing -------------------------------------------------------
  function widthStorageKey(): string | null {
    return persistKey ? `bo-grid:widths:${persistKey}` : null;
  }
  function persistWidths() {
    const key = widthStorageKey();
    if (!key || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(widths));
    } catch {
      /* storage unavailable — overrides still apply this session */
    }
  }

  $effect(() => {
    persistKey;
    untrack(() => {
      const key = widthStorageKey();
      if (!key || typeof localStorage === 'undefined') return;
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (saved && typeof saved === 'object') widths = saved as WidthMap;
      } catch {
        /* corrupt value — ignore */
      }
    });
  });

  let resize: { key: string; startX: number; startW: number } | null = null;
  let justResized = false;

  function startResize(ci: number, e: PointerEvent) {
    if (!isResizable(cols[ci], resizable)) return;
    e.preventDefault();
    e.stopPropagation();
    const headCell = (e.currentTarget as HTMLElement).closest('.h') as HTMLElement | null;
    const startW = headCell ? headCell.getBoundingClientRect().width : layout.info[ci].width;
    resize = { key: cols[ci].key, startX: e.clientX, startW };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
  }
  function onResizeMove(e: PointerEvent) {
    if (!resize) return;
    const w = clampWidth(resize.startW + (e.clientX - resize.startX));
    widths = { ...widths, [resize.key]: w };
  }
  function onResizeUp() {
    if (!resize) return;
    resize = null;
    justResized = true; // swallow the click that ends this drag (no sort toggle)
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeUp);
    persistWidths();
  }
  /** Double-click a resize grip to clear the override and restore the default. */
  function resetWidth(ci: number, e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const key = cols[ci].key;
    if (widths[key] == null) return;
    const next = { ...widths };
    delete next[key];
    widths = next;
    persistWidths();
  }

  // Cycle one key: undefined → asc → desc → removed.
  function nextDir(dir: SortDir | undefined): SortDir | null {
    if (dir === undefined) return 'asc';
    if (dir === 'asc') return 'desc';
    return null; // was desc → drop the key
  }

  function toggleSort(col: ColumnDef, additive: boolean) {
    if (justResized) {
      justResized = false;
      return;
    }
    if (!isSortable(col)) return;
    const current = sorts.find((s) => s.key === col.key);
    const dir = nextDir(current?.dir);

    if (additive) {
      // Shift-click: add/cycle this key while keeping the rest of the order.
      const rest = sorts.filter((s) => s.key !== col.key);
      setSorts(dir ? [...rest, { key: col.key, dir }] : rest);
      return;
    }
    // Plain click: sort by this column alone. If it's already the sole key,
    // cycle its direction (asc → desc → off); otherwise start fresh ascending.
    const soleAndSame = sorts.length === 1 && sorts[0].key === col.key;
    if (soleAndSame) setSorts(dir ? [{ key: col.key, dir }] : []);
    else setSorts([{ key: col.key, dir: 'asc' }]);
  }

  // Sort direction + 1-based position for a column, or null if unsorted.
  function sortInfo(key: string): { dir: SortDir; pos: number } | null {
    const i = sorts.findIndex((s) => s.key === key);
    return i === -1 ? null : { dir: sorts[i].dir, pos: i + 1 };
  }

  // In-memory pipeline (skipped entirely in source mode).
  const view = $derived.by(() => {
    if (source) return [] as GridRow[];
    const base = rows;
    const allCols = columns;
    const f = filter.trim().toLowerCase();
    const s = sorts;
    return untrack(() => {
      let r = base;
      if (f) r = r.filter((row) => allCols.some((c) => String(row[c.key] ?? '').toLowerCase().includes(f)));
      if (s.length > 0) r = [...r].sort((a, b) => compareBySorts(a, b, s));
      return r;
    });
  });

  const flat = $derived.by<VisualRow[]>(() => {
    const v = view;
    const gb = groupBy;
    collapsedVersion;
    return untrack(() => buildFlatRows(v, gb, collapsed));
  });

  // Header select-all state over the in-memory rows (source mode can't enumerate
  // unloaded ids, so the header checkbox is disabled there).
  const selectAll = $derived.by(() => {
    selRowsVersion;
    if (source) return { checked: false, indeterminate: false };
    const v = view;
    let n = 0;
    for (const r of v) if (selectedRows.has(r.id)) n++;
    return { checked: n > 0 && n === v.length, indeterminate: n > 0 && n < v.length };
  });

  function toggleAll(): void {
    if (source) return;
    const clearing = selectAll.checked;
    for (const r of view) {
      if (clearing) selectedRows.delete(r.id);
      else selectedRows.add(r.id);
    }
    selRowsVersion++;
    onRowSelectionChange?.([...selectedRows]);
  }

  // Pinned totals row: per-column `groupAgg` over all (filtered) rows. Reads row
  // values reactively so it stays live with the feed. In-memory mode only.
  const footerCells = $derived.by<string[] | null>(() => {
    if (!footer || source) return null;
    const v = view;
    return cols.map((col) => {
      if (col.type === 'sparkline' || col.type === 'text' || col.type === 'custom' || !col.groupAgg) return '';
      const vals: number[] = [];
      for (const row of v) {
        const n = Number(row[col.key]);
        if (Number.isFinite(n)) vals.push(n);
      }
      const a = aggregate(vals);
      if (!a) return '';
      return col.groupAgg === 'count' ? String(a.count) : formatCell(col, a[col.groupAgg]);
    });
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
  const rowWidthStyle = $derived(
    pinned ? `width:${layout.totalWidth + selOffset * SEL_W}px;right:auto;` : '',
  );
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
    const s = sorts;
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
        cells.push(col.type === 'sparkline' || col.type === 'custom' ? '' : formatCell(col, row[col.key]));
      }
      lines.push(cells.join('\t'));
    }
    try {
      await navigator.clipboard?.writeText(lines.join('\n'));
    } catch {
      /* clipboard unavailable — ignore */
    }
  }

  async function pasteSelection() {
    if (!onCellEdit) return; // no sink for edits — paste is a no-op
    const anchor = sel.bounds;
    if (!anchor) return;
    let text = '';
    try {
      text = (await navigator.clipboard?.readText()) ?? '';
    } catch {
      return; // clipboard read blocked/unavailable
    }
    const grid = parseClipboard(text);
    if (grid.length === 0) return;

    const single = isSingleCell(grid);
    // Single value fills the whole selection (Excel behaviour); a block
    // pastes from the top-left anchor, clamped to the grid bounds.
    const r0 = anchor.r0;
    const c0 = anchor.c0;
    const rSpan = single ? anchor.r1 - anchor.r0 + 1 : grid.length;
    let wrote = 0;
    for (let dr = 0; dr < rSpan; dr++) {
      const r = r0 + dr;
      if (r > rowCount - 1) break;
      const srcRow = single ? grid[0] : grid[dr];
      const cSpan = single ? anchor.c1 - anchor.c0 + 1 : srcRow.length;
      for (let dc = 0; dc < cSpan; dc++) {
        const c = c0 + dc;
        if (c > cols.length - 1) break;
        const raw = single ? grid[0][0] : (srcRow[dc] ?? '');
        if (writeCell(r, c, raw)) wrote++;
      }
    }
    // Surface the pasted region as the new selection so it's visible.
    if (wrote > 0) {
      const rEnd = Math.min(r0 + rSpan - 1, rowCount - 1);
      const cEnd = single
        ? anchor.c1
        : Math.min(c0 + Math.max(...grid.map((g) => g.length)) - 1, cols.length - 1);
      sel.start(r0, c0);
      sel.extendTo(rEnd, cEnd);
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
      if (onRowClick) {
        const row = dataAt(f.r);
        if (row) {
          e.preventDefault();
          onRowClick(row, e);
          return;
        }
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
    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      void pasteSelection();
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
    sorts;
    collapsedVersion;
    source;
    untrack(() => {
      sel.clear();
      editing = null;
    });
  });
</script>

<!-- `bo-grid` is an unscoped public class: a stable hook for consumer overrides. -->
<div
  class="bo-grid grid"
  role="grid"
  tabindex="0"
  id={gid}
  aria-rowcount={rowCount + 1}
  aria-colcount={cols.length + selOffset}
  aria-multiselectable="true"
  aria-activedescendant={activeId}
  style={themeStyle}
  bind:this={gridEl}
  onkeydown={onKeydown}
>
  <div class="head" role="row" aria-rowindex={1} bind:this={headEl} style={pinned ? 'overflow:hidden;' : ''}>
    {#if rowSelection}
      <span class="selcell selhead" role="columnheader" aria-colindex={1} style={selCellStyle(true)}>
        <input
          type="checkbox"
          class="rowcheck"
          checked={selectAll.checked}
          indeterminate={selectAll.indeterminate}
          disabled={!!source}
          aria-label="Select all rows"
          onclick={(e) => e.stopPropagation()}
          onchange={toggleAll}
        />
      </span>
    {/if}
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
        aria-colindex={ci + 1 + selOffset}
        draggable="true"
        aria-sort={isSortable(col) && sortInfo(col.key)
          ? sortInfo(col.key)?.dir === 'asc'
            ? 'ascending'
            : 'descending'
          : 'none'}
        onclick={(e) => toggleSort(col, e.shiftKey)}
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
        {#if isSortable(col) && sortInfo(col.key)}
          {@const si = sortInfo(col.key)}
          <span class="ind">
            {si?.dir === 'asc' ? '▲' : '▼'}{#if sorts.length > 1}<span class="ord">{si?.pos}</span>{/if}
          </span>
        {/if}
        {#if isResizable(col, resizable)}
          <span
            class="grip"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize {col.header}"
            onpointerdown={(e) => startResize(ci, e)}
            ondblclick={(e) => resetWidth(ci, e)}
            ondragstart={(e) => e.preventDefault()}
            draggable="false"
          ></span>
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
          <div class="sticky-row" aria-hidden="true" style="height:{baseH}px">
            <GroupRow group={g} columns={cols} onToggle={toggleGroup} />
          </div>
        {/each}
      </div>
    {/if}
    <div class="spacer" style="height:{total}px;{pinned ? `width:${layout.totalWidth + selOffset * SEL_W}px;` : ''}">
      {#each renderItems as item (item.vr)}
        {#if item.kind === 'group'}
          <div class="grouprow" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#if rowSelection}<span class="selcell" aria-hidden="true" style={selCellStyle(false)}></span>{/if}
            <GroupRow group={item.group} columns={cols} onToggle={toggleGroup} rowIndex={item.vr + 2} />
          </div>
        {:else if item.kind === 'skeleton'}
          <div class="row skeleton" role="row" aria-rowindex={item.vr + 2} aria-hidden="true" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#if rowSelection}<span class="selcell" style={selCellStyle(false)}></span>{/if}
            {#each cols as col, ci (ci)}
              <span class="c" style={cellWidthStyle(ci)}><span class="skelbar"></span></span>
            {/each}
          </div>
        {:else}
          <!-- Row activation is keyboard-accessible at the grid level: Enter on the focused cell fires onRowClick (focus is via aria-activedescendant). -->
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="row {rowClass?.(item.row) ?? ''}" class:alt={item.vr % 2 === 1} class:rowsel={rowSelection && isRowSelected(item.row.id)} class:clickable={!!onRowClick} role="row" tabindex="-1" aria-rowindex={item.vr + 2} aria-selected={rowSelection ? isRowSelected(item.row.id) : undefined} style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}" onclick={(e) => onRowClick?.(item.row, e)}>
            {#if rowSelection}
              <span class="selcell" style={selCellStyle(false)}>
                <input
                  type="checkbox"
                  class="rowcheck"
                  checked={isRowSelected(item.row.id)}
                  aria-label="Select row"
                  onpointerdown={(e) => e.stopPropagation()}
                  onclick={(e) => e.stopPropagation()}
                  onchange={() => toggleRow(item.row.id)}
                />
              </span>
            {/if}
            {#each cols as col, ci (ci)}
              <Cell
                {col}
                row={item.row}
                r={item.vr}
                c={ci}
                colIndex={ci + 1 + selOffset}
                cellId={`${gid}-r${item.vr}-c${ci}`}
                cellSnippet={cell}
                selected={sel.contains(item.vr, ci)}
                focused={sel.isFocus(item.vr, ci)}
                pinned={pinned && layout.info[ci].pinned}
                pinLeft={layout.info[ci].left + selOffset * SEL_W}
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
    {#if footerCells}
      <div class="footer" role="row" style={pinned ? `width:${layout.totalWidth + selOffset * SEL_W}px;` : ''}>
        {#if rowSelection}<span class="selcell" aria-hidden="true" style={selCellStyle(false)}></span>{/if}
        {#each cols as col, ci (ci)}
          <span class="fcell" class:right={isNumeric(col)} style={cellWidthStyle(ci)}>
            {ci === 0 && !footerCells[ci] ? 'Total' : footerCells[ci]}
          </span>
        {/each}
      </div>
    {/if}
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
    position: relative;
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
  /* Drag-to-resize grip: a thin hit-target straddling the column's right edge. */
  .h .grip {
    position: absolute;
    top: 0;
    right: -3px;
    width: 7px;
    height: 100%;
    cursor: col-resize;
    z-index: 6;
    touch-action: none;
  }
  .h .grip::after {
    content: '';
    position: absolute;
    top: 20%;
    right: 3px;
    width: 1px;
    height: 60%;
    background: var(--bo-border);
    opacity: 0;
    transition: opacity 120ms;
  }
  .h .grip:hover::after,
  .h .grip:active::after {
    opacity: 1;
    background: var(--bo-sel-border);
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
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 9px;
    color: var(--bo-text);
  }
  .h .ind .ord {
    font-size: 8px;
    line-height: 1;
    color: var(--bo-text-dim);
    font-variant-numeric: tabular-nums;
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
  .row.rowsel {
    background: var(--bo-sel-fill);
  }
  .row.clickable {
    cursor: pointer;
  }

  /* Pinned totals row: sticks to the bottom of the viewport. */
  .footer {
    position: sticky;
    bottom: 0;
    z-index: 4;
    display: flex;
    align-items: stretch;
    min-width: 100%;
    height: 32px;
    background: var(--bo-header-bg);
    border-top: 0.5px solid var(--bo-border);
  }
  .footer .fcell {
    display: flex;
    align-items: center;
    padding: 0 8px;
    font-family: var(--bo-mono);
    font-size: 11px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--bo-text);
    overflow: hidden;
    white-space: nowrap;
  }
  .footer .fcell.right {
    justify-content: flex-end;
  }

  /* Leading checkbox column (row selection). */
  .selcell {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }
  .selhead {
    border-bottom: 0.5px solid var(--bo-border);
  }
  .rowcheck {
    width: 14px;
    height: 14px;
    cursor: pointer;
    accent-color: var(--bo-sel-border);
  }
  .rowcheck:disabled {
    cursor: not-allowed;
    opacity: 0.4;
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
