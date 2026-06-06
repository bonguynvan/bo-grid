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
  import { buildTreeRows } from './tree';
  import { moveIndex } from './reorder';
  import { parseClipboard, isSingleCell } from './clipboard';
  import { applyWidths, clampWidth, isResizable, type WidthMap } from './sizing';
  import {
    passesFilters,
    isFilterActive,
    defaultFilterKind,
    distinctValues,
    type ColumnFilter,
    type FilterKind,
  } from './filtering';
  import type { RowSource } from './source';
  import { RowSourceController } from './source.svelte';
  import Cell from './Cell.svelte';
  import GroupRow from './GroupRow.svelte';
  import AggregationBar from './AggregationBar.svelte';
  import Pager from './Pager.svelte';
  import RowMenu from './RowMenu.svelte';

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
    onColumnVisibilityChange,
    columnMenu = false,
    columnsPanel = false,
    rowClass,
    getRowId = (r: GridRow) => r.id,
    onRowClick,
    sort,
    onSortChange,
    columnFilters,
    onFilterChange,
    footer = false,
    onCellClick,
    pinnedRows = [],
    filterRow = false,
    filterMenu = false,
    quickFilter = false,
    fillHandle = false,
    emptyMessage = 'No matching rows',
    loading = false,
    rowMenu,
    detail,
    detailHeight = 160,
    getChildren,
    onRowReorder,
    pageSize = 0,
    page,
    onPageChange,
    onColumnReorder,
    onColumnResize,
    ariaLabel,
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
    onRowSelectionChange?: (selectedIds: Array<string | number>) => void;
    /** Column keys to hide (controlled). Build your own column-picker UI and
        drive this prop — the grid stays presentation-only. Composed (union) with
        columns the user hides at runtime via the column menu. */
    hiddenColumns?: string[];
    /** Called with all currently-hidden column keys whenever the runtime set
        changes (column menu hide/show). */
    onColumnVisibilityChange?: (hidden: string[]) => void;
    /** Enable a per-column header menu (a ⋮ trigger) with sort, hide and (with
        `filterMenu`) filter actions. Default false. */
    columnMenu?: boolean;
    /** Show a "Columns" button that opens a panel to toggle column visibility
        (the place to restore columns hidden via the menu). Lazy-loaded. Default
        false. */
    columnsPanel?: boolean;
    /** Return extra CSS class(es) for a data row (e.g. to colour by value).
        Style them via `:global(.your-class)` since rows live inside the grid. */
    rowClass?: (row: GridRow) => string | undefined;
    /** Identity key for row selection. Defaults to `row.id`; override for
        string/UUID/composite keys. */
    getRowId?: (row: GridRow) => string | number;
    /** Called when a data row is activated by click or Enter (open a detail
        view, navigate, …). Edit-input and checkbox clicks are excluded. */
    onRowClick?: (row: GridRow, event: MouseEvent | KeyboardEvent) => void;
    /** Controlled sort order (multi-key, primary first). When set, the grid
        reflects this and reports changes via `onSortChange` instead of holding
        its own state. Omit for uncontrolled sorting. */
    sort?: SortState[];
    /** Called with the new sort order whenever a header is clicked. */
    onSortChange?: (sort: SortState[]) => void;
    /** Controlled column filters (keyed by column key). When set, the grid
        reflects these and reports changes via `onFilterChange` instead of holding
        its own. Omit for uncontrolled filtering. */
    columnFilters?: Record<string, ColumnFilter>;
    /** Called with the full column-filter map whenever a header filter changes. */
    onFilterChange?: (filters: Record<string, ColumnFilter>) => void;
    /** Show a pinned totals row: each column with a `groupAgg` shows that
        aggregate over all (filtered) rows. In-memory mode only. Default false. */
    footer?: boolean;
    /** Called when a cell is clicked, with its row, column and value. Fires in
        addition to `onRowClick`; excluded for the edit input. */
    onCellClick?: (
      info: { row: GridRow; column: ColumnDef; value: unknown },
      event: MouseEvent,
    ) => void;
    /** Rows pinned to the top, always visible above the scroll (a benchmark, a
        summary, "your position"). Display-only — not virtualized or selectable. */
    pinnedRows?: GridRow[];
    /** Show a per-column filter input row under the header. Rows must match every
        non-empty column filter (AND). In-memory mode only. Default false. */
    filterRow?: boolean;
    /** Enable a per-column header filter menu (lazy-loaded on first open). Each
        filterable column shows a funnel; the menu's control matches the column
        type (text/number/date). Override or disable per column with `col.filter`.
        Works in source mode too (filters are delegated to the `RowSource`); set
        filters need in-memory data. Default false. */
    filterMenu?: boolean;
    /** Show a built-in quick-filter search box above the grid that matches across
        all column values (ANDed with the `filter` prop). In-memory mode only.
        Default false. */
    quickFilter?: boolean;
    /** Show an Excel-style fill handle at the selection's bottom-right corner;
        drag it to copy the selected value(s) across the extended range (editable
        columns only). In-memory mode only. Default false. */
    fillHandle?: boolean;
    /** Message shown when there are no rows. Default 'No matching rows'. */
    emptyMessage?: string;
    /** Show a loading overlay over the grid (for consumer-driven async work in
        in-memory mode; source mode shows skeleton rows automatically). */
    loading?: boolean;
    /** Right-click row menu. Return the items for a row; an empty array shows no
        menu. Each item runs `onSelect` and closes the menu. */
    rowMenu?: (row: GridRow) => Array<{ label: string; onSelect: () => void }>;
    /** Master-detail: render an expandable detail panel under a row. Adds a
        leading expand-toggle column. In-memory mode only (overrides rowHeight). */
    detail?: Snippet<[{ row: GridRow }]>;
    /** Height (px) of the expanded detail panel. Default 160. */
    detailHeight?: number;
    /** Tree data: return a row's children (undefined/empty = leaf). When set,
        `rows` are the roots; the grid renders an indented, expandable tree.
        In-memory mode; filter/sort/group/paginate are not applied to the tree. */
    getChildren?: (row: GridRow) => GridRow[] | undefined;
    /** Enable drag-to-reorder rows via a handle in the first column. Called with
        the from/to indices (into the visible rows) on drop — reorder your own
        `rows` in here. Flat, unsorted, in-memory lists only. */
    onRowReorder?: (fromIndex: number, toIndex: number) => void;
    /** Rows per page. When > 0 (in-memory mode), shows a pager instead of one
        long scroll; rows still virtualize within a page. Default 0 (off). */
    pageSize?: number;
    /** Controlled current page (0-based). Omit for uncontrolled paging. */
    page?: number;
    /** Called with the new page index when the pager is used. */
    onPageChange?: (page: number) => void;
    /** Called with the new column-key order after a header drag-reorder. */
    onColumnReorder?: (keys: string[]) => void;
    /** Called with a column key + new width after a drag-resize. */
    onColumnResize?: (key: string, width: number) => void;
    /** Accessible name for the grid (`aria-label` on the `role="grid"` root). */
    ariaLabel?: string;
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
  let filterRowEl = $state<HTMLDivElement>();
  let groupHeadEl = $state<HTMLDivElement>();

  const sel = new Selection();
  let dragging = $state(false);
  // Fill handle: drag the selection's corner to copy its value(s) across.
  let filling = $state(false);
  let fillTo = $state<{ r: number; c: number } | null>(null);
  let fillSource: { r0: number; c0: number; r1: number; c1: number } | null = null;
  let editing = $state<{ r: number; c: number } | null>(null);
  // When editing was opened by typing a character (type-to-edit), the editor
  // seeds its input with it; null means edit the existing value (dblclick/Enter).
  let editSeed = $state<string | null>(null);

  function startEdit(r: number, c: number, seed: string | null = null) {
    if (!isEditable(cols[c]) || !dataAt(r)) return;
    editSeed = seed;
    editing = { r, c };
  }
  // ---- Edit history (undo / redo) -------------------------------------------
  // The grid is controlled (the consumer owns the data via onCellEdit), so undo
  // re-emits onCellEdit with the previous value. History is keyed by row object
  // reference + column, so it survives sort/filter/reorder. Multi-cell ops
  // (paste, fill) record as one grouped step.
  type EditCell = { row: GridRow; col: ColumnDef; old: string | number; value: string | number };
  const UNDO_LIMIT = 100;
  let undoStack: EditCell[][] = [];
  let redoStack: EditCell[][] = [];
  let currentBatch: EditCell[] | null = null;
  function pushUndo(group: EditCell[]): void {
    undoStack.push(group);
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack = [];
  }
  /** Group every writeCell inside `fn` into a single undo step. */
  function batch(fn: () => void): void {
    const prev = currentBatch;
    currentBatch = [];
    fn();
    const group = currentBatch;
    currentBatch = prev;
    if (group.length) pushUndo(group);
  }

  // Coerce + validate a raw string for cell (r,c) and emit onCellEdit, recording
  // it for undo. Returns true if written, false if rejected (not editable,
  // missing row, or invalid number). Shared by inline edit, paste and fill.
  function writeCell(r: number, c: number, raw: string): boolean {
    const col = cols[c];
    if (!col || !isEditable(col)) return false;
    const row = dataAt(r);
    if (!row) return false;
    let value: string | number = raw;
    if (col.type === 'date') {
      // The date editor emits a yyyy-mm-dd string; store the column's ms value.
      const ms = Date.parse(`${raw}T00:00:00Z`);
      if (!Number.isFinite(ms)) return false;
      value = ms;
    } else if (isNumeric(col)) {
      const n = Number(raw);
      if (!Number.isFinite(n)) return false; // reject invalid number, keep old value
      value = n;
    }
    if (col.validate && !col.validate(value, row)) return false; // consumer rejected it
    const old = (row[col.key] ?? '') as string | number;
    onCellEdit?.({ row, column: col, value });
    if (onCellEdit) {
      const entry: EditCell = { row, col, old, value };
      if (currentBatch) currentBatch.push(entry);
      else pushUndo([entry]);
    }
    return true;
  }
  function undo(): void {
    const group = undoStack.pop();
    if (!group) return;
    for (const e of group) onCellEdit?.({ row: e.row, column: e.col, value: e.old });
    redoStack.push(group);
    editing = null;
  }
  function redo(): void {
    const group = redoStack.pop();
    if (!group) return;
    for (const e of group) onCellEdit?.({ row: e.row, column: e.col, value: e.value });
    undoStack.push(group);
    editing = null;
  }

  function commitEdit(r: number, c: number, raw: string) {
    editing = null;
    editSeed = null;
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

  // Per-column filter text (filterRow), keyed by column key.
  let colFilters = $state<Record<string, string>>({});

  // Structured per-column filters from the header filter menu (v0.3), keyed by
  // column key. Menu filters take precedence over the filterRow text inputs.
  // Controlled by the `columnFilters` prop when provided, else internal state.
  let internalColumnFilters = $state<Record<string, ColumnFilter>>({});
  const activeColumnFilters = $derived(columnFilters ?? internalColumnFilters);
  function setColumnFilters(next: Record<string, ColumnFilter>): void {
    if (columnFilters === undefined) internalColumnFilters = next; // uncontrolled: own it
    onFilterChange?.(next); // always notify
  }

  // Built-in quick-filter text (global, matches across all columns).
  let quickText = $state('');

  // Whole-row selection (opt-in), keyed by row id so it survives sort/filter.
  // Plain Set + a version counter for reactivity (same pattern as `collapsed`).
  const SEL_W = 40; // checkbox column width (px)
  const EXP_W = 30; // master-detail expand column width (px)
  const selectedRows = new Set<string | number>();
  let selRowsVersion = $state(0);

  // Master-detail expansion (opt-in via `detail`), keyed by row id.
  const expandedRows = new Set<string | number>();
  let expVersion = $state(0);
  const expandable = $derived(!!detail && !source);

  // Leading fixed columns: expand toggle (if any) then checkbox (if any).
  const selOffset = $derived(rowSelection ? 1 : 0);
  const expOffset = $derived(expandable ? 1 : 0);
  const leadCols = $derived(selOffset + expOffset); // count, for aria indices
  const leadPx = $derived(selOffset * SEL_W + expOffset * EXP_W); // px, for sticky offsets

  function isExpanded(id: string | number): boolean {
    expVersion; // track
    return expandedRows.has(id);
  }
  function toggleExpand(id: string | number): void {
    if (expandedRows.has(id)) expandedRows.delete(id);
    else expandedRows.add(id);
    expVersion++;
  }

  function isRowSelected(id: string | number): boolean {
    selRowsVersion; // track
    return selectedRows.has(id);
  }
  function toggleRow(id: string | number): void {
    if (selectedRows.has(id)) selectedRows.delete(id);
    else selectedRows.add(id);
    selRowsVersion++;
    onRowSelectionChange?.([...selectedRows]);
  }

  const ordered = $derived(order.length === columns.length ? order.map((i) => columns[i]) : columns);
  // Columns hidden at runtime via the column menu, unioned with the controlled
  // `hiddenColumns` prop.
  let runtimeHidden = $state<string[]>([]);
  const effectiveHidden = $derived(
    runtimeHidden.length ? [...new Set([...hiddenColumns, ...runtimeHidden])] : hiddenColumns,
  );
  // Drop hidden columns. Applied after ordering so `order` stays indexed over the
  // full column set.
  const visible = $derived(
    effectiveHidden.length ? ordered.filter((c) => !effectiveHidden.includes(c.key)) : ordered,
  );
  // Apply any resize overrides (turns the dragged column fixed-width), then
  // pin-arrange. Both are no-ops by default, so the grid stays fit-to-width.
  const sized = $derived(applyWidths(visible, widths));
  // Runtime pin overrides (column menu) layered on top of static `col.pinned`.
  let pinOverrides = $state<Record<string, 'left' | 'right' | false>>({});
  const pinnedSized = $derived(
    Object.keys(pinOverrides).length
      ? sized.map((c) => (c.key in pinOverrides ? { ...c, pinned: pinOverrides[c.key] } : c))
      : sized,
  );
  // Pin-arrangement: pinned columns move to the edges and get sticky offsets.
  // When nothing is pinned this is a no-op and the grid stays fit-to-width.
  const layout = $derived(arrangePinned(pinnedSized));
  const cols = $derived(layout.columns);
  const pinned = $derived(layout.anyPinned);

  // Spanning header groups: consecutive columns sharing a `group` label merge
  // into one parent header cell (width = sum of child widths). null when unused.
  const headerGroups = $derived.by<{ label: string; width: number }[] | null>(() => {
    if (!cols.some((c) => c.group)) return null;
    const runs: { label: string; width: number }[] = [];
    for (let i = 0; i < cols.length; i++) {
      const label = cols[i].group ?? '';
      const w = layout.info[i].width;
      const last = runs[runs.length - 1];
      if (last && label !== '' && last.label === label) last.width += w;
      else runs.push({ label, width: w });
    }
    return runs;
  });

  // Theme → inline `--bo-grid-*` overrides. 'dark' uses the built-in defaults.
  const themeStyle = $derived(
    !theme || theme === 'dark' ? '' : themeVars(theme === 'light' ? lightTheme : theme),
  );

  // Screen readers track the active cell via aria-activedescendant (the focus
  // cell is always scrolled into view, so its element exists in the DOM).
  const activeId = $derived(sel.focus ? `${gid}-r${sel.focus.r}-c${sel.focus.c}` : undefined);

  // Pinned columns sit to the right of the (also-sticky) checkbox column, so
  // their sticky-left offsets shift by SEL_W when row selection is on.
  // Sticky position for a pinned column: left columns offset past the (also
  // sticky) checkbox column; right columns offset from the right edge.
  function pinStick(ci: number): string {
    const inf = layout.info[ci];
    if (inf.side === 'right') return `position:sticky;right:${inf.right}px;`;
    return `position:sticky;left:${inf.left + leadPx}px;`;
  }
  function headStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `${pinStick(ci)}z-index:5;background:var(--bo-header-bg);`;
    return s;
  }
  function cellWidthStyle(ci: number): string {
    if (!pinned) return colStyle(cols[ci]);
    const inf = layout.info[ci];
    let s = `flex:0 0 ${inf.width}px;width:${inf.width}px;`;
    if (inf.pinned) s += `${pinStick(ci)}z-index:1;background:var(--bo-bg);`;
    return s;
  }
  // The leading checkbox column: a fixed-width flex item, sticky-left (past the
  // expand column, if any) when the grid scrolls horizontally (pinned mode).
  function selCellStyle(header: boolean): string {
    let s = `flex:0 0 ${SEL_W}px;width:${SEL_W}px;`;
    if (pinned)
      s += `position:sticky;left:${expOffset * EXP_W}px;z-index:${header ? 6 : 2};background:var(--bo-${header ? 'header-bg' : 'bg'});`;
    return s;
  }
  // The leading expand-toggle column (master-detail), sticky at the far left.
  function expandCellStyle(header: boolean): string {
    let s = `flex:0 0 ${EXP_W}px;width:${EXP_W}px;`;
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
    onColumnReorder?.(next.map((i) => columns[i].key));
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

  // ---- Runtime column visibility (column menu) ------------------------------
  function hiddenStorageKey(): string | null {
    return persistKey ? `bo-grid:hidden:${persistKey}` : null;
  }
  $effect(() => {
    persistKey;
    untrack(() => {
      const key = hiddenStorageKey();
      if (!key || typeof localStorage === 'undefined') return;
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (Array.isArray(saved)) runtimeHidden = saved.filter((k) => typeof k === 'string');
      } catch {
        /* corrupt value — ignore */
      }
    });
  });
  function setRuntimeHidden(next: string[]): void {
    runtimeHidden = next;
    const key = hiddenStorageKey();
    if (key && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        /* storage unavailable — still applies this session */
      }
    }
    onColumnVisibilityChange?.(effectiveHidden);
  }
  function hideColumn(key: string): void {
    if (!runtimeHidden.includes(key)) setRuntimeHidden([...runtimeHidden, key]);
  }
  function showColumn(key: string): void {
    if (runtimeHidden.includes(key)) setRuntimeHidden(runtimeHidden.filter((k) => k !== key));
  }
  function toggleColumnVisible(key: string): void {
    if (effectiveHidden.includes(key)) showColumn(key);
    else hideColumn(key);
  }
  function showAllColumns(): void {
    setRuntimeHidden([]);
  }
  // Columns tool panel (lazy-loaded checklist), anchored at the toolbar button.
  let ToolPanelComp = $state<typeof import('./ToolPanel.svelte').default | null>(null);
  let panelXY = $state<{ x: number; y: number } | null>(null);
  async function openToolPanel(e: Event) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (!ToolPanelComp) ToolPanelComp = (await import('./ToolPanel.svelte')).default;
    panelXY = { x: rect.left, y: rect.bottom + 2 };
  }
  $effect(() => {
    if (!panelXY) return;
    const close = () => (panelXY = null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (panelXY = null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  });

  // ---- Runtime column pinning (column menu) ---------------------------------
  function pinStorageKey(): string | null {
    return persistKey ? `bo-grid:pin:${persistKey}` : null;
  }
  $effect(() => {
    persistKey;
    untrack(() => {
      const key = pinStorageKey();
      if (!key || typeof localStorage === 'undefined') return;
      try {
        const saved = JSON.parse(localStorage.getItem(key) ?? 'null');
        if (saved && typeof saved === 'object') pinOverrides = saved as typeof pinOverrides;
      } catch {
        /* corrupt value — ignore */
      }
    });
  });
  function setPinOverride(key: string, side: 'left' | 'right' | false): void {
    pinOverrides = { ...pinOverrides, [key]: side };
    const sk = pinStorageKey();
    if (sk && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(sk, JSON.stringify(pinOverrides));
      } catch {
        /* storage unavailable — still applies this session */
      }
    }
  }
  // Effective pin side for a column key: runtime override, else static config.
  function pinSideOf(col: ColumnDef): 'left' | 'right' | false {
    if (col.key in pinOverrides) return pinOverrides[col.key];
    return col.pinned === true ? 'left' : col.pinned || false;
  }

  let resize: { key: string; startX: number; startW: number; min?: number; max?: number } | null = null;
  let justResized = false;

  function startResize(ci: number, e: PointerEvent) {
    if (!isResizable(cols[ci], resizable)) return;
    e.preventDefault();
    e.stopPropagation();
    const headCell = (e.currentTarget as HTMLElement).closest('.h') as HTMLElement | null;
    const startW = headCell ? headCell.getBoundingClientRect().width : layout.info[ci].width;
    resize = { key: cols[ci].key, startX: e.clientX, startW, min: cols[ci].minWidth, max: cols[ci].maxWidth };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeUp);
  }
  function onResizeMove(e: PointerEvent) {
    if (!resize) return;
    const w = clampWidth(resize.startW + (e.clientX - resize.startX), resize.min, resize.max);
    widths = { ...widths, [resize.key]: w };
  }
  function onResizeUp() {
    if (!resize) return;
    const { key } = resize;
    resize = null;
    justResized = true; // swallow the click that ends this drag (no sort toggle)
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeUp);
    persistWidths();
    onColumnResize?.(key, widths[key]);
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
    const q = quickText.trim().toLowerCase();
    const s = sorts;
    // Active per-column filters: menu-driven structured filters (columnFilters)
    // take precedence; filterRow text inputs (colFilters) fill in the rest as
    // case-insensitive "contains".
    const active: Record<string, ColumnFilter> = { ...activeColumnFilters };
    for (const [k, v] of Object.entries(colFilters)) {
      if (!active[k] && v.trim()) active[k] = { kind: 'text', op: 'contains', q: v };
    }
    const hasColFilters = Object.keys(active).length > 0;
    return untrack(() => {
      let r = base;
      if (f) r = r.filter((row) => allCols.some((c) => String(row[c.key] ?? '').toLowerCase().includes(f)));
      if (q) r = r.filter((row) => allCols.some((c) => String(row[c.key] ?? '').toLowerCase().includes(q)));
      if (hasColFilters) {
        r = r.filter((row) => passesFilters(row, active));
      }
      if (s.length > 0) {
        const colOf = (k: string) => allCols.find((c) => c.key === k);
        r = [...r].sort((a, b) => compareBySorts(a, b, s, colOf));
      }
      return r;
    });
  });

  // Pagination (in-memory only): slice the view into pages; rows still
  // virtualize within a page. Off when pageSize <= 0.
  const paged = $derived(pageSize > 0 && !source);
  let internalPage = $state(0);
  const currentPage = $derived(page ?? internalPage); // controlled by `page` prop, else internal
  function setPage(p: number): void {
    if (page === undefined) internalPage = p; // uncontrolled: own the state
    onPageChange?.(p); // always notify
  }
  const pageCount = $derived(paged ? Math.max(1, Math.ceil(view.length / pageSize)) : 1);
  // Keep the page in range when the view shrinks (filter/sort changes).
  $effect(() => {
    const max = pageCount - 1;
    untrack(() => {
      if (currentPage > max) setPage(max);
    });
  });
  const pageRows = $derived(
    paged ? view.slice(currentPage * pageSize, currentPage * pageSize + pageSize) : view,
  );

  const treeData = $derived(!!getChildren && !source);

  // Drag-to-reorder rows (flat, unsorted, in-memory only). The handle lives in
  // the first cell; the dragged/drop indices are tracked in component state.
  const reorderable = $derived(
    !!onRowReorder && !source && !treeData && groupBy.length === 0 && pageSize <= 0,
  );
  let dragRowVr = $state(-1);
  let dropRowVr = $state(-1);
  function onRowDrop() {
    if (dragRowVr >= 0 && dropRowVr >= 0 && dragRowVr !== dropRowVr) {
      onRowReorder?.(dragRowVr, dropRowVr);
    }
    dragRowVr = -1;
    dropRowVr = -1;
  }

  const flat = $derived.by<VisualRow[]>(() => {
    if (treeData && getChildren) {
      const roots = rows;
      expVersion; // track expand/collapse
      return untrack(() =>
        buildTreeRows(roots, getChildren, (r) => expandedRows.has(getRowId(r))),
      );
    }
    const v = pageRows;
    const gb = groupBy;
    collapsedVersion;
    return untrack(() => buildFlatRows(v, gb, collapsed));
  });

  function goToPage(p: number): void {
    const next = Math.max(0, Math.min(p, pageCount - 1));
    if (next === currentPage) return;
    setPage(next);
    sel.clear();
    editing = null;
    if (viewportEl) viewportEl.scrollTop = 0;
  }

  // Header select-all state over the in-memory rows (source mode can't enumerate
  // unloaded ids, so the header checkbox is disabled there).
  const selectAll = $derived.by(() => {
    selRowsVersion;
    if (source) return { checked: false, indeterminate: false };
    const v = view;
    let n = 0;
    for (const r of v) if (selectedRows.has(getRowId(r))) n++;
    return { checked: n > 0 && n === v.length, indeterminate: n > 0 && n < v.length };
  });

  function toggleAll(): void {
    if (source) return;
    const clearing = selectAll.checked;
    for (const r of view) {
      if (clearing) selectedRows.delete(getRowId(r));
      else selectedRows.add(getRowId(r));
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
  // Use a prefix-sum height model when row heights vary: a `rowHeight` function,
  // or master-detail expansion (expanded rows are taller by `detailHeight`).
  const useHeights = $derived(variable || expandable);
  const heights = $derived.by<number[] | null>(() => {
    if (!useHeights) return null;
    const fn = variable ? (rowHeight as (row: GridRow, index: number) => number) : null;
    expVersion; // track expansion changes
    const arr = new Array<number>(flat.length);
    let di = 0;
    for (let i = 0; i < flat.length; i++) {
      const it = flat[i];
      if (it.kind !== 'data') {
        arr[i] = baseH;
        continue;
      }
      let h = fn ? Math.max(1, fn(it.row, di++)) : baseH;
      if (expandable && expandedRows.has(getRowId(it.row))) h += detailHeight;
      arr[i] = h;
    }
    return arr;
  });
  const hm = $derived(useHeights && heights ? variableHeights(heights) : uniformHeights(rowCount, baseH));

  const total = $derived(hm.total);
  const rowWidthStyle = $derived(
    pinned ? `width:${layout.totalWidth + leadPx}px;right:auto;` : '',
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
    | { vr: number; kind: 'data'; row: GridRow; depth?: number; hasChildren?: boolean }
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
        else out.push({ vr, kind: 'data', row: item.row, depth: item.depth, hasChildren: item.hasChildren });
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
    const cf = activeColumnFilters;
    void ctrl.fetch(range, s, f, cf);
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
    if (pinned && filterRowEl) filterRowEl.scrollLeft = el.scrollLeft; // and the filter row
    if (pinned && groupHeadEl) groupHeadEl.scrollLeft = el.scrollLeft; // and group headers
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
    if (filling) fillTo = { r, c };
    else if (dragging) sel.extendTo(r, c);
  }

  // Fill handle: start dragging from the selection's bottom-right corner.
  function onFillStart(): void {
    const b = sel.bounds;
    if (!b) return;
    fillSource = { ...b };
    fillTo = { r: b.r1, c: b.c1 };
    filling = true;
  }
  // The rectangle the fill drag currently covers (extends down/right only).
  const fillRange = $derived.by(() => {
    if (!filling || !fillSource || !fillTo) return null;
    return {
      r0: fillSource.r0,
      c0: fillSource.c0,
      r1: Math.max(fillSource.r1, fillTo.r),
      c1: Math.max(fillSource.c1, fillTo.c),
    };
  });
  function inFillPreview(r: number, c: number): boolean {
    const fr = fillRange;
    return !!fr && r >= fr.r0 && r <= fr.r1 && c >= fr.c0 && c <= fr.c1 && !sel.contains(r, c);
  }
  // Commit the fill: tile the source block's values across the extended range.
  function commitFill(): void {
    if (!filling) return;
    filling = false;
    const b = fillSource;
    const ft = fillTo;
    fillTo = null;
    fillSource = null;
    if (!b || !ft) return;
    const r1 = Math.max(b.r1, ft.r);
    const c1 = Math.max(b.c1, ft.c);
    if (r1 === b.r1 && c1 === b.c1) return; // no extension
    const srcRows = b.r1 - b.r0 + 1;
    const srcCols = b.c1 - b.c0 + 1;
    batch(() => {
      for (let r = b.r0; r <= r1; r++) {
        for (let c = b.c0; c <= c1; c++) {
          if (r <= b.r1 && c <= b.c1) continue; // skip the source block
          const srcRow = dataAt(b.r0 + ((r - b.r0) % srcRows));
          if (!srcRow) continue;
          writeCell(r, c, String(srcRow[cols[b.c0 + ((c - b.c0) % srcCols)].key] ?? ''));
        }
      }
    });
    sel.anchor = { r: b.r0, c: b.c0 };
    sel.focus = { r: r1, c: c1 };
  }

  // Right-click row menu (floating).
  let menu = $state<{ x: number; y: number; items: Array<{ label: string; onSelect: () => void }> } | null>(null);
  function openRowMenu(row: GridRow, e: MouseEvent) {
    if (!rowMenu) return;
    const items = rowMenu(row);
    if (items.length === 0) return;
    e.preventDefault();
    menu = { x: e.clientX, y: e.clientY, items };
  }
  $effect(() => {
    if (!menu) return;
    const close = () => (menu = null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (menu = null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  });

  // Header filter menu (v0.3), lazy-loaded on first open to keep the core lean.
  let FilterMenuComp = $state<typeof import('./FilterMenu.svelte').default | null>(null);
  let filterUi = $state<{
    key: string;
    kind: FilterKind;
    header: string;
    values: string[];
    x: number;
    y: number;
  } | null>(null);
  function filterKindFor(col: ColumnDef): FilterKind {
    return typeof col.filter === 'string' ? col.filter : defaultFilterKind(col);
  }
  async function openFilterMenu(col: ColumnDef, e: Event) {
    e.stopPropagation();
    // Read the anchor rect now — after the await, the event's currentTarget is null.
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let kind = filterKindFor(col);
    // A set filter needs distinct values; in source mode they can't be
    // enumerated, so fall back to the column's typed filter.
    if (source && kind === 'set') kind = defaultFilterKind(col);
    const values = !source && kind === 'set' ? distinctValues(rows, col.key) : [];
    if (!FilterMenuComp) FilterMenuComp = (await import('./FilterMenu.svelte')).default;
    filterUi = { key: col.key, kind, header: col.header, values, x: rect.left, y: rect.bottom + 2 };
  }
  function applyColumnFilter(key: string, f: ColumnFilter | null): void {
    const next = { ...activeColumnFilters };
    if (f) next[key] = f;
    else delete next[key];
    setColumnFilters(next);
    filterUi = null;
  }
  $effect(() => {
    if (!filterUi) return;
    const close = () => (filterUi = null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (filterUi = null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', close);
    };
  });

  // Autosize a column to its content (a character-count heuristic — no DOM
  // measurement, so it's cheap and deterministic). Sets the same width override
  // as a manual resize.
  function autosizeColumn(col: ColumnDef): void {
    const CHAR_PX = 7.5;
    const PAD = 32; // cell padding + room for the header icons
    let maxLen = col.header.length;
    if (!source) {
      for (const row of view.slice(0, 500)) {
        const s = formatCell(col, row[col.key], row);
        if (s.length > maxLen) maxLen = s.length;
      }
    }
    const w = clampWidth(Math.round(maxLen * CHAR_PX) + PAD, col.minWidth, col.maxWidth);
    widths = { ...widths, [col.key]: w };
    persistWidths();
    onColumnResize?.(col.key, w);
  }

  // Column header menu (⋮): sort / pin / autosize / hide. Reuses the floating
  // RowMenu (a light action list — no lazy chunk, unlike the filter menu).
  function columnMenuItems(col: ColumnDef): Array<{ label: string; onSelect: () => void }> {
    const items: Array<{ label: string; onSelect: () => void }> = [];
    if (isSortable(col)) {
      items.push({ label: 'Sort ascending', onSelect: () => setSorts([{ key: col.key, dir: 'asc' }]) });
      items.push({ label: 'Sort descending', onSelect: () => setSorts([{ key: col.key, dir: 'desc' }]) });
      if (sortInfo(col.key)) {
        items.push({ label: 'Clear sort', onSelect: () => setSorts(sorts.filter((s) => s.key !== col.key)) });
      }
    }
    const side = pinSideOf(col);
    if (side !== 'left') items.push({ label: 'Pin left', onSelect: () => setPinOverride(col.key, 'left') });
    if (side !== 'right') items.push({ label: 'Pin right', onSelect: () => setPinOverride(col.key, 'right') });
    if (side) items.push({ label: 'Unpin', onSelect: () => setPinOverride(col.key, false) });
    if (isResizable(col, resizable)) items.push({ label: 'Autosize', onSelect: () => autosizeColumn(col) });
    items.push({ label: 'Hide column', onSelect: () => hideColumn(col.key) });
    return items;
  }
  function openColumnMenu(col: ColumnDef, e: Event) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    menu = { x: rect.left, y: rect.bottom + 2, items: columnMenuItems(col) };
  }

  function onCellClicked(r: number, c: number, e: MouseEvent) {
    if (!onCellClick) return;
    const row = dataAt(r);
    if (!row) return;
    const column = cols[c];
    onCellClick({ row, column, value: row[column.key] }, e);
  }

  // Move the focus to an absolute (r, c), clamped; extend the selection if asked.
  function focusTo(r: number, c: number, extend: boolean) {
    const rr = Math.max(0, Math.min(r, maxR));
    const cc = Math.max(0, Math.min(c, maxC));
    if (extend) sel.extendTo(rr, cc);
    else sel.start(rr, cc);
    scrollFocusIntoView();
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
        cells.push(col.type === 'sparkline' || col.type === 'custom' ? '' : formatCell(col, row[col.key], row));
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
    batch(() => {
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
    });
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
    // Space toggles selection of the focused row (when the checkbox column is on),
    // so keyboard users can tick rows without reaching for the mouse.
    if (e.key === ' ' && rowSelection && sel.focus && !editing) {
      const row = dataAt(sel.focus.r);
      if (row) {
        e.preventDefault();
        toggleRow(getRowId(row));
        return;
      }
    }
    // Type-to-edit (Excel-style): a printable key on a focused editable text/number
    // cell opens the editor seeded with that character. Select-column editors keep
    // their Enter-to-open behavior.
    if (!mod && !e.altKey && e.key.length === 1 && e.key !== ' ' && sel.focus && !editing) {
      const f = sel.focus;
      const col = cols[f.c];
      if (isEditable(col) && col.type !== 'date' && !(col.options && col.options.length) && dataAt(f.r)) {
        e.preventDefault();
        startEdit(f.r, f.c, e.key);
        return;
      }
    }
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      if (undoStack.length) {
        e.preventDefault();
        undo();
        return;
      }
    }
    if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      if (redoStack.length) {
        e.preventDefault();
        redo();
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
    if (mod && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      void pasteSelection();
      return;
    }
    if (e.key === 'Escape') {
      sel.clear();
      return;
    }
    // Open the row menu from the keyboard (ContextMenu key / Shift+F10).
    if (rowMenu && sel.focus && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) {
      const row = dataAt(sel.focus.r);
      const items = row ? rowMenu(row) : [];
      if (items.length > 0) {
        e.preventDefault();
        const rect = document.getElementById(activeId ?? '')?.getBoundingClientRect();
        menu = { x: rect?.left ?? 0, y: rect?.bottom ?? 0, items };
        return;
      }
    }
    // Open the column menu from the keyboard (Alt+ArrowDown) at the focused column.
    if (columnMenu && sel.focus && e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      const rect = document.getElementById(activeId ?? '')?.getBoundingClientRect();
      menu = { x: rect?.left ?? 0, y: rect?.bottom ?? 0, items: columnMenuItems(cols[sel.focus.c]) };
      return;
    }
    // Tree nav: ArrowRight expands a collapsed node, ArrowLeft collapses an
    // expanded one (treegrid pattern); otherwise arrows move normally.
    if (treeData && sel.focus && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
      const item = flat[sel.focus.r];
      if (item?.kind === 'data' && item.hasChildren) {
        const id = getRowId(item.row);
        const open = expandedRows.has(id);
        if (e.key === 'ArrowRight' && !open) {
          e.preventDefault();
          toggleExpand(id);
          return;
        }
        if (e.key === 'ArrowLeft' && open) {
          e.preventDefault();
          toggleExpand(id);
          return;
        }
      }
    }
    // Home/End (row, or whole grid with Ctrl/⌘); PageUp/PageDown by a viewport page.
    const f = sel.focus;
    if (f && (e.key === 'Home' || e.key === 'End' || e.key === 'PageUp' || e.key === 'PageDown')) {
      e.preventDefault();
      const page = Math.max(1, Math.floor(height / baseH) - 1);
      if (e.key === 'Home') focusTo(mod ? 0 : f.r, 0, e.shiftKey);
      else if (e.key === 'End') focusTo(mod ? maxR : f.r, maxC, e.shiftKey);
      else if (e.key === 'PageDown') focusTo(f.r + page, f.c, e.shiftKey);
      else focusTo(f.r - page, f.c, e.shiftKey);
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
    const up = () => {
      dragging = false;
      if (filling) commitFill();
    };
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
  aria-label={ariaLabel}
  aria-rowcount={rowCount + 1}
  aria-colcount={cols.length + leadCols}
  aria-multiselectable="true"
  aria-activedescendant={activeId}
  style={themeStyle}
  bind:this={gridEl}
  onkeydown={onKeydown}
>
  {#if quickFilter || columnsPanel}
    <div class="bo-toolbar">
      {#if quickFilter}
        <input
          class="bo-quickfilter"
          type="search"
          placeholder="Search…"
          aria-label="Quick filter"
          bind:value={quickText}
        />
      {/if}
      {#if columnsPanel}
        <button class="bo-cols-toggle" type="button" onclick={openToolPanel}>⊟ Columns</button>
      {/if}
    </div>
  {/if}
  {#if headerGroups}
    <div class="head-groups" aria-hidden="true" bind:this={groupHeadEl} style={pinned ? 'overflow:hidden;' : ''}>
      {#if expandable}<span class="expandcell" style={expandCellStyle(true)}></span>{/if}
      {#if rowSelection}<span class="selcell" style={selCellStyle(true)}></span>{/if}
      {#each headerGroups as g, gi (gi)}
        <span class="hg" class:empty={!g.label} style="flex:0 0 {g.width}px;width:{g.width}px;">{g.label}</span>
      {/each}
    </div>
  {/if}
  <div class="head" role="row" aria-rowindex={1} bind:this={headEl} style={pinned ? 'overflow:hidden;' : ''}>
    {#if expandable}
      <span class="expandcell selhead" role="columnheader" aria-colindex={1} style={expandCellStyle(true)}></span>
    {/if}
    {#if rowSelection}
      <span class="selcell selhead" role="columnheader" aria-colindex={1 + expOffset} style={selCellStyle(true)}>
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
        class="h {col.headerClass ?? ''}"
        class:right={isNumeric(col) || col.align === 'right'}
        class:sortable={isSortable(col)}
        class:dragging={ci === dragSrc}
        class:dragover={ci === dragOver && ci !== dragSrc}
        style={headStyle(ci)}
        type="button"
        role="columnheader"
        aria-colindex={ci + 1 + leadCols}
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
        {#if filterMenu && col.type !== 'sparkline' && col.filter !== false}
          <span
            class="funnel"
            class:on={isFilterActive(activeColumnFilters[col.key])}
            role="button"
            tabindex="-1"
            aria-label="Filter {col.header}"
            title="Filter {col.header}"
            onclick={(e) => openFilterMenu(col, e)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openFilterMenu(col, e);
            }}
            ondragstart={(e) => e.preventDefault()}
            draggable="false"
          >
            <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">
              <path d="M0 1h10L6 6v3L4 8V6z" fill="currentColor" />
            </svg>
          </span>
        {/if}
        {#if columnMenu}
          <span
            class="hmenu"
            role="button"
            tabindex="-1"
            aria-label="{col.header} menu"
            title="{col.header} menu"
            onclick={(e) => openColumnMenu(col, e)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') openColumnMenu(col, e);
            }}
            ondragstart={(e) => e.preventDefault()}
            draggable="false">⋮</span>
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

  {#if filterRow && !source}
    <div class="filter-row" role="row" bind:this={filterRowEl} style={pinned ? 'overflow:hidden;' : ''}>
      {#if expandable}<span class="expandcell" style={expandCellStyle(false)}></span>{/if}
      {#if rowSelection}<span class="selcell" style={selCellStyle(false)}></span>{/if}
      {#each cols as col, ci (ci)}
        <span class="fr-cell" style={cellWidthStyle(ci)}>
          {#if col.type !== 'sparkline' && col.type !== 'custom'}
            <input
              class="fr-input"
              type="search"
              placeholder="filter…"
              aria-label="Filter {col.header}"
              value={colFilters[col.key] ?? ''}
              oninput={(e) => (colFilters = { ...colFilters, [col.key]: e.currentTarget.value })}
            />
          {/if}
        </span>
      {/each}
    </div>
  {/if}

  <div
    class="viewport"
    style="height:{height}px;{pinned ? 'overflow-x:auto;' : ''}"
    bind:this={viewportEl}
    onscroll={onScroll}
  >
    {#if pinnedRows.length > 0}
      <div class="pinned-top">
        {#each pinnedRows as prow, pi (getRowId(prow))}
          <div class="row pinrow {rowClass?.(prow) ?? ''}" role="row" aria-hidden="true" style="height:{baseH}px;{rowWidthStyle}">
            {#if expandable}<span class="expandcell" style={expandCellStyle(false)}></span>{/if}
            {#if rowSelection}<span class="selcell" style={selCellStyle(false)}></span>{/if}
            {#each cols as col, ci (ci)}
              <Cell
                {col}
                row={prow}
                r={-1 - pi}
                c={ci}
                colIndex={ci + 1 + leadCols}
                cellId={`${gid}-pin${pi}-c${ci}`}
                cellSnippet={cell}
                pinned={pinned && layout.info[ci].pinned}
                pinSide={layout.info[ci].side ?? 'left'}
                pinOffset={layout.info[ci].side === 'right' ? layout.info[ci].right : layout.info[ci].left + leadPx}
                width={pinned ? layout.info[ci].width : undefined}
              />
            {/each}
          </div>
        {/each}
      </div>
    {/if}
    {#if rowCount === 0 && !controller?.loading}
      <div class="empty">{emptyMessage}</div>
    {/if}
    {#if loading}
      <div class="loading-overlay" aria-busy="true" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span class="loading-label">Loading…</span>
      </div>
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
    <div class="spacer" style="height:{total}px;{pinned ? `width:${layout.totalWidth + leadPx}px;` : ''}">
      {#each renderItems as item (item.vr)}
        {#if item.kind === 'group'}
          <div class="grouprow" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#if expandable}<span class="expandcell" aria-hidden="true" style={expandCellStyle(false)}></span>{/if}
            {#if rowSelection}<span class="selcell" aria-hidden="true" style={selCellStyle(false)}></span>{/if}
            <GroupRow group={item.group} columns={cols} onToggle={toggleGroup} rowIndex={item.vr + 2} />
          </div>
        {:else if item.kind === 'skeleton'}
          <div class="row skeleton" role="row" aria-rowindex={item.vr + 2} aria-hidden="true" style="top:{hm.offsetOf(item.vr)}px;height:{hm.heightOf(item.vr)}px;{rowWidthStyle}">
            {#if expandable}<span class="expandcell" style={expandCellStyle(false)}></span>{/if}
            {#if rowSelection}<span class="selcell" style={selCellStyle(false)}></span>{/if}
            {#each cols as col, ci (ci)}
              <span class="c" style={cellWidthStyle(ci)}><span class="skelbar"></span></span>
            {/each}
          </div>
        {:else}
          <!-- Row activation is keyboard-accessible at the grid level: Enter on the focused cell fires onRowClick (focus is via aria-activedescendant). -->
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <div class="row {rowClass?.(item.row) ?? ''}" class:alt={item.vr % 2 === 1} class:rowsel={rowSelection && isRowSelected(getRowId(item.row))} class:clickable={!!onRowClick} class:droptarget={reorderable && dropRowVr === item.vr && dragRowVr !== item.vr} role="row" tabindex="-1" aria-rowindex={item.vr + 2} aria-selected={rowSelection ? isRowSelected(getRowId(item.row)) : undefined} aria-level={treeData ? (item.depth ?? 0) + 1 : undefined} aria-expanded={treeData && item.hasChildren ? isExpanded(getRowId(item.row)) : undefined} style="top:{hm.offsetOf(item.vr)}px;height:{expandable ? baseH : hm.heightOf(item.vr)}px;{rowWidthStyle}" onclick={(e) => onRowClick?.(item.row, e)} oncontextmenu={(e) => openRowMenu(item.row, e)} ondragover={reorderable ? (e) => { if (dragRowVr < 0) return; e.preventDefault(); dropRowVr = item.vr; } : undefined} ondrop={reorderable ? (e) => { e.preventDefault(); onRowDrop(); } : undefined}>
            {#if expandable}
              <span class="expandcell" style={expandCellStyle(false)}>
                <button
                  class="expand-toggle"
                  type="button"
                  aria-expanded={isExpanded(getRowId(item.row))}
                  aria-label="Toggle detail"
                  onpointerdown={(e) => e.stopPropagation()}
                  onclick={(e) => {
                    e.stopPropagation();
                    toggleExpand(getRowId(item.row));
                  }}
                >
                  {isExpanded(getRowId(item.row)) ? '▾' : '▸'}
                </button>
              </span>
            {/if}
            {#if rowSelection}
              <span class="selcell" style={selCellStyle(false)}>
                <input
                  type="checkbox"
                  class="rowcheck"
                  checked={isRowSelected(getRowId(item.row))}
                  aria-label="Select row"
                  onpointerdown={(e) => e.stopPropagation()}
                  onclick={(e) => e.stopPropagation()}
                  onchange={() => toggleRow(getRowId(item.row))}
                />
              </span>
            {/if}
            {#each cols as col, ci (ci)}
              <Cell
                {col}
                row={item.row}
                r={item.vr}
                c={ci}
                colIndex={ci + 1 + leadCols}
                cellId={`${gid}-r${item.vr}-c${ci}`}
                cellSnippet={cell}
                selected={sel.contains(item.vr, ci)}
                focused={sel.isFocus(item.vr, ci)}
                pinned={pinned && layout.info[ci].pinned}
                pinSide={layout.info[ci].side ?? 'left'}
                pinOffset={layout.info[ci].side === 'right' ? layout.info[ci].right : layout.info[ci].left + leadPx}
                width={pinned ? layout.info[ci].width : undefined}
                alt={item.vr % 2 === 1}
                editing={editing?.r === item.vr && editing?.c === ci}
                seed={editing?.r === item.vr && editing?.c === ci ? editSeed : null}
                fillCorner={fillHandle && !!sel.bounds && item.vr === sel.bounds.r1 && ci === sel.bounds.c1}
                fillpreview={inFillPreview(item.vr, ci)}
                {onFillStart}
                tree={treeData && ci === 0
                  ? {
                      depth: item.depth ?? 0,
                      hasChildren: item.hasChildren ?? false,
                      expanded: isExpanded(getRowId(item.row)),
                      onToggle: () => toggleExpand(getRowId(item.row)),
                    }
                  : undefined}
                dragHandle={reorderable && ci === 0
                  ? { onStart: () => (dragRowVr = item.vr), onEnd: () => (dragRowVr = -1) }
                  : undefined}
                {onCellDown}
                {onCellEnter}
                onCellClick={onCellClick ? onCellClicked : undefined}
                onCellDblClick={startEdit}
                onEditCommit={(raw) => commitEdit(item.vr, ci, raw)}
                onEditCancel={() => {
                  editing = null;
                  editSeed = null;
                }}
              />
            {/each}
          </div>
          {#if expandable && detail && isExpanded(getRowId(item.row))}
            <div class="row-detail" style="top:{hm.offsetOf(item.vr) + baseH}px;height:{detailHeight}px;{rowWidthStyle}">
              {@render detail({ row: item.row })}
            </div>
          {/if}
        {/if}
      {/each}
    </div>
    {#if footerCells}
      <div class="footer" role="row" style={pinned ? `width:${layout.totalWidth + leadPx}px;` : ''}>
        {#if expandable}<span class="expandcell" aria-hidden="true" style={expandCellStyle(false)}></span>{/if}
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

  {#if paged}
    <Pager page={currentPage} {pageCount} total={view.length} onGoto={goToPage} />
  {/if}

  {#if menu}
    <RowMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => (menu = null)} />
  {/if}

  {#if filterUi && FilterMenuComp}
    {@const Menu = FilterMenuComp}
    {@const key = filterUi.key}
    <Menu
      kind={filterUi.kind}
      header={filterUi.header}
      filter={activeColumnFilters[key] ?? null}
      values={filterUi.values}
      x={filterUi.x}
      y={filterUi.y}
      onApply={(f) => applyColumnFilter(key, f)}
      onClose={() => (filterUi = null)}
    />
  {/if}

  {#if panelXY && ToolPanelComp}
    {@const Panel = ToolPanelComp}
    <Panel
      columns={ordered.map((c) => ({ key: c.key, header: c.header }))}
      hidden={effectiveHidden}
      x={panelXY.x}
      y={panelXY.y}
      onToggle={toggleColumnVisible}
      onShowAll={showAllColumns}
      onClose={() => (panelXY = null)}
    />
  {/if}
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
    /* Layout/density tokens (override via --bo-grid-* for a custom look). */
    --bo-radius: var(--bo-grid-radius, 8px);
    --bo-font-size: var(--bo-grid-font-size, 13px);
    --bo-cell-pad: var(--bo-grid-cell-pad, 8px);

    /* Theme native controls (checkboxes, date pickers, number spinners, search
       clear buttons, scrollbars) and accent fills to match the grid theme. */
    color-scheme: var(--bo-grid-scheme, dark);
    accent-color: var(--bo-up);

    display: flex;
    flex-direction: column;
    color: var(--bo-text);
    font-family: var(--bo-sans);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: var(--bo-radius);
    overflow: hidden;
    outline: none;
  }
  .grid:focus-visible {
    border-color: var(--bo-sel-border);
  }
  /* Built-in quick-filter toolbar (opt-in via `quickFilter`). */
  .bo-toolbar {
    display: flex;
    padding: 6px;
    border-bottom: 0.5px solid var(--bo-border);
    background: var(--bo-header-bg);
  }
  .bo-quickfilter {
    width: 100%;
    max-width: 260px;
    padding: 5px 9px;
    font: inherit;
    font-size: 12px;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
  }
  .bo-quickfilter::placeholder {
    color: var(--bo-text-dim);
  }
  .bo-cols-toggle {
    margin-left: auto;
    padding: 5px 11px;
    font: inherit;
    font-size: 12px;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
    cursor: pointer;
  }
  .bo-cols-toggle:hover {
    border-color: var(--bo-text-dim);
  }

  /* Spanning header groups (row above the column headers). */
  .head-groups {
    display: flex;
    align-items: stretch;
    height: var(--bo-header-h);
    background: var(--bo-header-bg);
    border-bottom: 0.5px solid var(--bo-border);
  }
  .head-groups .hg {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    padding: 0 8px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--bo-text);
    border-right: 0.5px solid var(--bo-border);
    overflow: hidden;
    white-space: nowrap;
  }
  .head-groups .hg.empty {
    border-right: 0;
    background: transparent;
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
    padding: 0 var(--bo-cell-pad, 8px);
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
  /* Header filter funnel: a click target that opens the (lazy) filter menu. */
  .h .funnel {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    color: var(--bo-text-dim);
    opacity: 0.55;
    cursor: pointer;
    transition: opacity 120ms, color 120ms;
  }
  .h .funnel:hover {
    opacity: 1;
    color: var(--bo-text);
  }
  .h .funnel.on {
    opacity: 1;
    color: var(--bo-up);
  }
  /* Header column-menu (⋮) trigger. */
  .h .hmenu {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    font-size: 14px;
    line-height: 1;
    color: var(--bo-text-dim);
    opacity: 0.55;
    cursor: pointer;
    transition: opacity 120ms, color 120ms;
  }
  .h .hmenu:hover {
    opacity: 1;
    color: var(--bo-text);
  }

  /* Per-column filter input row, under the header. */
  .filter-row {
    display: flex;
    align-items: stretch;
    height: 30px;
    border-bottom: 0.5px solid var(--bo-border);
    background: var(--bo-header-bg);
  }
  .filter-row .fr-cell {
    display: flex;
    align-items: center;
    padding: 0 4px;
    min-width: 0;
  }
  .filter-row .fr-input {
    width: 100%;
    min-width: 0;
    padding: 2px 6px;
    font: inherit;
    font-family: var(--bo-mono);
    font-size: 11px;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 4px;
    outline: none;
  }
  .filter-row .fr-input:focus {
    border-color: var(--bo-sel-border);
  }

  .viewport {
    position: relative;
    overflow-y: auto;
    overflow-x: hidden;
    user-select: none;
    /* Thin, themed scrollbars (Firefox) — Chromium/Safari below. */
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--bo-text-dim) 55%, transparent) transparent;
  }
  .viewport::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }
  .viewport::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--bo-text-dim) 45%, transparent);
    border: 2px solid transparent;
    background-clip: padding-box;
    border-radius: 6px;
  }
  .viewport::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--bo-text-dim) 70%, transparent);
    background-clip: padding-box;
  }
  .viewport::-webkit-scrollbar-corner {
    background: transparent;
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
  .loading-overlay {
    position: sticky;
    top: 0;
    left: 0;
    z-index: 7;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    height: 100%;
    margin-bottom: -100%; /* overlay without consuming scroll height */
    color: var(--bo-text-dim);
    font-size: 13px;
    background: color-mix(in srgb, var(--bo-bg) 70%, transparent);
    backdrop-filter: blur(1px);
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--bo-border);
    border-top-color: var(--bo-sel-border);
    border-radius: 50%;
    animation: bo-spin 0.7s linear infinite;
  }
  @keyframes bo-spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      animation: none;
    }
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
  .row.droptarget {
    box-shadow: inset 0 2px 0 var(--bo-sel-border);
  }

  /* Pinned top rows: stick to the top of the viewport above the scroll. */
  .pinned-top {
    position: sticky;
    top: 0;
    z-index: 5;
    background: var(--bo-bg);
    box-shadow: 0 1px 0 var(--bo-border);
  }
  .pinned-top .pinrow {
    display: flex;
    align-items: stretch;
    min-width: 100%;
    background: color-mix(in srgb, var(--bo-header-bg) 70%, var(--bo-sel-fill) 60%);
    border-bottom: 0.5px solid var(--bo-border);
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

  /* Master-detail: leading expand-toggle column + detail panel. */
  .expandcell {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
  }
  .expand-toggle {
    width: 20px;
    height: 20px;
    padding: 0;
    font-size: 11px;
    line-height: 1;
    color: var(--bo-text-dim);
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  .expand-toggle:hover {
    color: var(--bo-text);
    background: var(--bo-row-hover);
  }
  .row-detail {
    position: absolute;
    left: 0;
    overflow: auto;
    background: var(--bo-row-a);
    border-bottom: 0.5px solid var(--bo-border);
    box-shadow: inset 0 1px 0 var(--bo-border);
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
