import type { ColumnDef, GridRow } from './column';
import { formatCell, isNumeric } from './column';

export interface ExportOptions {
  /** Use formatted display strings instead of raw values. Default false. */
  formatted?: boolean;
  /** Include a header row. Default true. */
  header?: boolean;
}

type Cell = string | number;

function rawValue(col: ColumnDef, v: unknown): Cell {
  if (col.type === 'date') return formatCell(col, v); // epoch ms isn't useful raw
  if (isNumeric(col)) {
    const n = Number(v);
    return Number.isFinite(n) ? n : '';
  }
  return v == null ? '' : String(v);
}

/**
 * Build a 2-D matrix (rows × columns) for export. Sparkline columns are skipped.
 * `formatted` produces display strings; otherwise numeric columns stay numbers
 * so spreadsheets can compute on them.
 */
export function rowsToMatrix(
  rows: readonly GridRow[],
  columns: readonly ColumnDef[],
  opts: ExportOptions = {},
): Cell[][] {
  const cols = columns.filter((c) => c.type !== 'sparkline' && c.type !== 'custom');
  const matrix: Cell[][] = [];
  if (opts.header !== false) matrix.push(cols.map((c) => c.header));
  for (const row of rows) {
    matrix.push(cols.map((c) => (opts.formatted ? formatCell(c, row[c.key], row) : rawValue(c, row[c.key]))));
  }
  return matrix;
}

function csvCell(v: Cell): string {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(
  rows: readonly GridRow[],
  columns: readonly ColumnDef[],
  opts: ExportOptions = {},
): string {
  return rowsToMatrix(rows, columns, opts)
    .map((r) => r.map(csvCell).join(','))
    .join('\r\n');
}

/** Trigger a browser download of text content. No-op outside the browser. */
export function download(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCSV(
  filename: string,
  rows: readonly GridRow[],
  columns: readonly ColumnDef[],
  opts: ExportOptions = {},
): void {
  download(filename, toCSV(rows, columns, opts));
}
