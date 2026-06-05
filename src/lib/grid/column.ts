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
  /** flex-grow weight; column stretches to fill remaining space. */
  flex?: number;
  align?: Align;
  /** Amber flash on value change (drives off the row's flashSeq/flashDir). */
  flash?: boolean;
  /** Set false to disable header-click sorting on this column. */
  sortable?: boolean;
  /** When grouping is active, show this aggregate of the column on group headers. */
  groupAgg?: AggKind;
  /** Pin this column to the left; it stays visible during horizontal scroll. */
  pinned?: boolean;
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
  | (ColBase & { type: 'sparkline'; sparkKey: string });

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

export function formatCell(col: ColumnDef, value: unknown): string {
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

function rawCompare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

export function compareRows(a: GridRow, b: GridRow, sort: SortState): number {
  const d = rawCompare(a[sort.key], b[sort.key]);
  return sort.dir === 'asc' ? d : -d;
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
  return col.type !== 'text' && col.type !== 'sparkline';
}

export function candlesOf(row: GridRow, key: string): Candle[] {
  return (row[key] as Candle[]) ?? [];
}
