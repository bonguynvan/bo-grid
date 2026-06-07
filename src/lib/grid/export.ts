import type { ColumnDef, GridRow } from './column';
import { formatCell, isNumeric, cellValue } from './column';

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
    matrix.push(
      cols.map((c) => {
        const v = cellValue(c, row);
        return opts.formatted ? formatCell(c, v, row) : rawValue(c, v);
      }),
    );
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

/**
 * Parse RFC4180 CSV text into a 2-D string matrix — handles quoted fields with
 * embedded commas, doubled quotes and newlines, and CRLF or LF line endings.
 * Pure; the inverse of `rowsToMatrix`. Unit-tested.
 */
export function parseCSVMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
  };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        field += c;
        i++;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      endField();
      i++;
    } else if (c === '\n') {
      endRow();
      i++;
    } else if (c === '\r') {
      i++; // CRLF: the \n ends the row
    } else {
      field += c;
      i++;
    }
  }
  if (field !== '' || row.length > 0) endRow(); // trailing line without a newline
  return rows;
}

/**
 * Parse CSV text into grid rows. The first line is the header; each header maps
 * to a column by `header` or `key`. Numeric columns are coerced to numbers and
 * `date` columns parsed to epoch ms (`Date.parse`); blanks and unparseable values
 * stay as-is. Rows get a sequential `id` + flash fields so they're `GridRow`-ready.
 * Inverse of `toCSV` — round-trips. Pure; unit-tested.
 */
export function parseCSV(text: string, columns: readonly ColumnDef[] = []): GridRow[] {
  const matrix = parseCSVMatrix(text).filter((r) => !(r.length === 1 && r[0] === '')); // drop blank lines
  if (matrix.length < 1) return [];
  const headers = matrix[0];
  const cols = headers.map((h) => columns.find((c) => c.header === h || c.key === h));
  return matrix.slice(1).map((cells, i) => {
    const row: Record<string, unknown> = { id: i, flashSeq: 0, flashDir: 'up' };
    headers.forEach((h, c) => {
      const col = cols[c];
      const raw = cells[c] ?? '';
      const key = col ? col.key : h;
      if (raw === '') {
        row[key] = '';
      } else if (col?.type === 'date') {
        const ms = Date.parse(raw);
        row[key] = Number.isFinite(ms) ? ms : raw;
      } else if (col && isNumeric(col)) {
        const n = Number(raw);
        row[key] = Number.isFinite(n) ? n : raw;
      } else {
        row[key] = raw;
      }
    });
    return row as GridRow;
  });
}
