import type { Candle } from '../types';
import { fmtPrice, fmtPercent, fmtVolume, fmtDate, type DateStyle } from '../format/format';
import type { AggKind } from './aggregate';

export type Align = 'left' | 'right';

interface ColBase {
  /** Field on the row to read for this column's value. */
  key: string;
  header: string;
  /** Fixed width in px. Ignored when `flex` is set. */
  width?: number;
  /** Min/max width (px) enforced while drag-resizing this column. */
  minWidth?: number;
  maxWidth?: number;
  /** flex-grow weight; column stretches to fill remaining space. */
  flex?: number;
  align?: Align;
  /** Extra class(es) for this column's data cells — a static string, or a
      function of the cell value/row for conditional styling. Target via
      `:global(.bo-grid .c.your-class)`. */
  cellClass?: string | ((value: unknown, row: GridRow) => string | undefined);
  /** Extra class(es) for this column's header. Target via `:global`. */
  headerClass?: string;
  /** Amber flash on value change (drives off the row's flashSeq/flashDir). */
  flash?: boolean;
  /** Set false to disable header-click sorting on this column. */
  sortable?: boolean;
  /** Custom ascending comparator for this column's values (e.g. enum priority or
      natural sort). Direction is applied by the grid. In-memory mode only. */
  compare?: (a: unknown, b: unknown) => number;
  /** When grouping is active, show this aggregate of the column on group headers. */
  groupAgg?: AggKind;
  /** Pin this column so it stays visible during horizontal scroll. `true` /
      `'left'` pins to the left edge, `'right'` to the right. */
  pinned?: boolean | 'left' | 'right';
  /** Allow inline editing (double-click or Enter on the focused cell). */
  editable?: boolean;
  /** Validate an edited value before it commits (inline edit or paste). Return
      false to reject and keep the old value. Receives the coerced value. */
  validate?: (value: string | number, row: GridRow) => boolean;
  /** Editable choices: when set, editing renders a `<select>` of these options
      instead of a text input (enum/status columns). */
  options?: string[];
  /** Set a native `title` tooltip on each cell (the full formatted value) — handy
      when content truncates. */
  tooltip?: boolean;
  /** Custom display formatter, overriding the built-in type formatter. Applies
      to display, tooltip, copy and (formatted) export. `row` is absent for
      aggregate cells. */
  format?: (value: unknown, row?: GridRow) => string;
  /** Set false to disable drag-to-resize on this column (default on). */
  resizable?: boolean;
  /** Parent header label. Consecutive columns sharing a `group` render under a
      spanning header. Best with fixed-width columns. */
  group?: string;
}

export interface CellEditEvent {
  row: GridRow;
  column: ColumnDef;
  /** Parsed value: a number for numeric columns, otherwise the raw string. */
  value: string | number;
}

/**
 * Discriminated column config — the public Phase 0 "columns + rows" surface,
 * extended with the Phase 1 sparkline + heatmap cell types.
 */
export type ColumnDef =
  | (ColBase & { type: 'text'; sub?: string })
  | (ColBase & { type: 'price' })
  | (ColBase & { type: 'percent' })
  | (ColBase & { type: 'volume' })
  | (ColBase & { type: 'number'; decimals?: number })
  | (ColBase & { type: 'date'; dateStyle?: DateStyle })
  | (ColBase & { type: 'heatmap'; min: number; max: number; decimals?: number })
  | (ColBase & { type: 'sparkline'; sparkKey: string })
  // Rendered by the consumer's `cell` snippet on <Grid>.
  | (ColBase & { type: 'custom' });

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDir;
}

/** Minimal row contract the grid relies on. Concrete rows add their own fields. */
export interface GridRow {
  id: number;
  flashSeq: number;
  flashDir: 'up' | 'down';
  [field: string]: unknown;
}

export function formatCell(col: ColumnDef, value: unknown, row?: GridRow): string {
  if (col.format) return col.format(value, row);
  const n = typeof value === 'number' ? value : Number(value);
  switch (col.type) {
    case 'price':
      return fmtPrice(n);
    case 'percent':
      return fmtPercent(n);
    case 'volume':
      return fmtVolume(n);
    case 'number':
      return n.toFixed(col.decimals ?? 2);
    case 'date':
      return fmtDate(n, col.dateStyle);
    case 'heatmap':
      return n.toFixed(col.decimals ?? 2);
    default:
      return value == null ? '' : String(value);
  }
}

export function isSortable(col: ColumnDef): boolean {
  return col.type !== 'sparkline' && col.sortable !== false;
}

export function isEditable(col: ColumnDef): boolean {
  return !!col.editable && col.type !== 'sparkline' && col.type !== 'date' && col.type !== 'custom';
}

function rawCompare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

export function compareRows(a: GridRow, b: GridRow, sort: SortState, col?: ColumnDef): number {
  const d = col?.compare ? col.compare(a[sort.key], b[sort.key]) : rawCompare(a[sort.key], b[sort.key]);
  return sort.dir === 'asc' ? d : -d;
}

/**
 * Multi-key comparison: apply each sort in order, returning the first that
 * separates the rows. An empty list leaves rows in their original order.
 */
export function compareBySorts(
  a: GridRow,
  b: GridRow,
  sorts: readonly SortState[],
  colOf?: (key: string) => ColumnDef | undefined,
): number {
  for (const sort of sorts) {
    const d = compareRows(a, b, sort, colOf?.(sort.key));
    if (d !== 0) return d;
  }
  return 0;
}

export function colStyle(col: ColumnDef): string {
  if (col.flex) return `flex:${col.flex} 1 0;min-width:0;`;
  return `flex:0 0 ${col.width ?? 96}px;`;
}

/** Concrete pixel width for a column (flex columns get a sensible default). */
export function colWidth(col: ColumnDef): number {
  return col.flex ? (col.width ?? 160) : (col.width ?? 96);
}

export function isNumeric(col: ColumnDef): boolean {
  return col.type !== 'text' && col.type !== 'sparkline' && col.type !== 'custom';
}

export function candlesOf(row: GridRow, key: string): Candle[] {
  return (row[key] as Candle[]) ?? [];
}
