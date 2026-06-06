// Clipboard TSV (tab-separated values) parsing for paste support.
//
// Spreadsheets (Excel, Google Sheets) and the grid's own copy use a simple
// TSV shape: rows joined by "\n", cells within a row joined by "\t". This is
// deliberately not full CSV — no quoting/escaping — to match what copy emits
// and what spreadsheets put on the clipboard for a plain rectangular range.

/**
 * Parse clipboard text into a rectangular grid of cell strings.
 *
 * Tolerates CRLF / lone CR line endings and a single trailing newline
 * (spreadsheets append one when copying a range). Empty input yields `[]`.
 */
export function parseClipboard(text: string): string[][] {
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (t.endsWith('\n')) t = t.slice(0, -1);
  if (t === '') return [];
  return t.split('\n').map((line) => line.split('\t'));
}

/** True when the parsed clipboard holds exactly one cell. */
export function isSingleCell(grid: string[][]): boolean {
  return grid.length === 1 && grid[0].length === 1;
}
