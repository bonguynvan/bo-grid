// Printable / export HTML for the grid. The live grid virtualizes (only ~a
// viewport of rows is in the DOM), so printing it directly drops most rows. These
// helpers render ALL (already filtered/sorted) rows to a standalone HTML table —
// dependency-free, and they reuse the column formatters so output matches the grid.
import type { ColumnDef, GridRow } from './column';
import { formatCell, cellValue, isNumeric } from './column';

const ESC: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};
/** Escape a string for safe HTML text/attribute interpolation. */
export function escapeHTML(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c]);
}

/**
 * Render rows to a semantic `<table>` HTML string (formatted via the column
 * formatters; numeric columns right-aligned; sparkline/custom columns skipped).
 * Values are HTML-escaped. Pure; unit-tested. Embed it, or use `printTable`.
 */
export function toHTMLTable(rows: readonly GridRow[], columns: readonly ColumnDef[]): string {
  const cols = columns.filter((c) => c.type !== 'sparkline' && c.type !== 'custom');
  const align = (c: ColumnDef): string => (isNumeric(c) ? ' style="text-align:right"' : '');
  const head = cols.map((c) => `<th${align(c)}>${escapeHTML(c.header)}</th>`).join('');
  const body = rows
    .map(
      (row) =>
        '<tr>' +
        cols.map((c) => `<td${align(c)}>${escapeHTML(formatCell(c, cellValue(c, row), row))}</td>`).join('') +
        '</tr>',
    )
    .join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

const PRINT_CSS = `
*{box-sizing:border-box}
body{font:12px -apple-system,system-ui,sans-serif;color:#111;margin:24px}
h1{font-size:16px;margin:0 0 12px}
table{border-collapse:collapse;width:100%}
th,td{padding:4px 8px;border:1px solid #ddd;white-space:nowrap;text-align:left}
thead th{background:#f4f4f4;font-weight:600}
tbody tr:nth-child(even){background:#fafafa}
@media print{body{margin:0}}`;

/**
 * Open a print window with all rows as a clean table and trigger the print
 * dialog. No-op outside the browser (or if a popup is blocked). For PDFs, users
 * "Save as PDF" from the print dialog.
 */
export function printTable(
  rows: readonly GridRow[],
  columns: readonly ColumnDef[],
  opts: { title?: string } = {},
): void {
  if (typeof window === 'undefined' || typeof window.open !== 'function') return;
  const win = window.open('', '_blank');
  if (!win) return; // popup blocked
  const title = opts.title ?? 'Grid';
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHTML(title)}</title>` +
      `<style>${PRINT_CSS}</style></head><body><h1>${escapeHTML(title)}</h1>` +
      `${toHTMLTable(rows, columns)}` +
      `<script>window.onload=function(){window.print()}<\/script></body></html>`,
  );
  win.document.close();
}
