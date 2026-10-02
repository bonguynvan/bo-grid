// Merged cells: which cells span down (spanRows) and across (colSpan).
// Pure: the grid renders from the plan; nothing here touches the DOM.

import { cellValue, type ColumnDef, type GridRow } from './column';

export interface SpanRun {
  /** First visual row of the run (inclusive). */
  start: number;
  /** Last visual row of the run (inclusive). */
  end: number;
}

export interface MergePlan {
  /** The run containing visual row `vr` in display column `ci`, or null when
      that cell does not merge (run of one, or the column never spans). */
  runOf(ci: number, vr: number): SpanRun | null;
  /** Per display column: 1 = normal, 0 = covered, n > 1 = covers n columns.
      Null when nothing spans in that row. */
  colSpansOf(vr: number): Uint16Array | null;
}

export interface MergeInput {
  /** Visible columns in display order. */
  columns: readonly ColumnDef[];
  /** Number of visual rows. */
  count: number;
  /** The data row at a visual index, or null for group headers / placeholders. */
  rowAt: (vr: number) => GridRow | null;
  /** Pin section of a display column (left, scrolling, right); spans never cross one. */
  sectionOf: (ci: number) => number;
  /** A run never continues past a row for which this returns true. */
  breakAfter?: (vr: number) => boolean;
  /** Set false to ignore `colSpan` (e.g. under column virtualization). Default true. */
  colSpan?: boolean;
}

const isBlank = (v: unknown): boolean => v == null || v === '';

function joins(col: ColumnDef, a: GridRow, b: GridRow): boolean {
  const rule = col.spanRows;
  if (typeof rule === 'function') return rule(a, b);
  const va = cellValue(col, a);
  return !isBlank(va) && Object.is(va, cellValue(col, b));
}

function spanCount(col: ColumnDef, row: GridRow): number {
  const n = Math.floor(Number(col.colSpan?.(row)));
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** Column spans for one row: 1 normal, 0 covered, n > 1 covers n columns.
    Null when no cell in the row spans. */
export function colSpanRow(
  columns: readonly ColumnDef[],
  row: GridRow,
  sectionOf: (ci: number) => number,
): Uint16Array | null {
  let out: Uint16Array | null = null;
  for (let ci = 0; ci < columns.length; ci++) {
    if (out && out[ci] === 0) continue;
    const col = columns[ci];
    if (!col.colSpan) continue;
    let n = spanCount(col, row);
    if (n <= 1) continue;
    const sec = sectionOf(ci);
    let reach = 1;
    while (reach < n && ci + reach < columns.length && sectionOf(ci + reach) === sec) reach++;
    n = reach;
    if (n <= 1) continue;
    if (!out) out = new Uint16Array(columns.length).fill(1);
    out[ci] = n;
    for (let k = 1; k < n; k++) out[ci + k] = 0;
  }
  return out;
}

/** Build the merge plan for a view, or null when no column merges. */
export function buildMergePlan(input: MergeInput): MergePlan | null {
  const { columns, count, rowAt, sectionOf, breakAfter } = input;
  const useColSpan = input.colSpan !== false && columns.some((c) => !!c.colSpan);
  const spanCols = columns.map((c, ci) => (c.spanRows ? ci : -1)).filter((ci) => ci >= 0);
  if (!useColSpan && spanCols.length === 0) return null;

  const rowSpans: Array<Uint16Array | null> = new Array(count).fill(null);
  if (useColSpan) {
    for (let vr = 0; vr < count; vr++) {
      const row = rowAt(vr);
      if (row) rowSpans[vr] = colSpanRow(columns, row, sectionOf);
    }
  }
  const widthAt = (vr: number, ci: number): number => rowSpans[vr]?.[ci] ?? 1;

  // A boundary at vr means "a new run starts here". Shared across spanning
  // columns in display order, so a break on the left also breaks the right.
  const boundary = new Uint8Array(count);
  const runs = new Map<number, { starts: Int32Array; ends: Int32Array }>();
  for (const ci of spanCols) {
    const col = columns[ci];
    const starts = new Int32Array(count);
    let prev: GridRow | null = null;
    for (let vr = 0; vr < count; vr++) {
      const row = rowAt(vr);
      const covered = row !== null && widthAt(vr, ci) === 0;
      if (!row || covered) {
        boundary[vr] = 1;
        starts[vr] = vr;
        prev = null;
        continue;
      }
      const continues =
        prev !== null &&
        !boundary[vr] &&
        !breakAfter?.(vr - 1) &&
        widthAt(vr, ci) === widthAt(vr - 1, ci) &&
        joins(col, prev, row);
      if (!continues) boundary[vr] = 1;
      starts[vr] = continues ? starts[vr - 1] : vr;
      prev = row;
    }
    const ends = new Int32Array(count);
    for (let vr = count - 1; vr >= 0; vr--) {
      ends[vr] = vr < count - 1 && starts[vr + 1] === starts[vr] ? ends[vr + 1] : vr;
    }
    runs.set(ci, { starts, ends });
  }

  return {
    runOf(ci, vr) {
      const r = runs.get(ci);
      if (!r || vr < 0 || vr >= count) return null;
      const start = r.starts[vr];
      const end = r.ends[vr];
      return end > start ? { start, end } : null;
    },
    colSpansOf(vr) {
      return rowSpans[vr] ?? null;
    },
  };
}

/** The flex style for one cell standing in for several fit-to-width columns:
    fixed widths add to the basis, flex weights add to the grow factor. */
export function combinedFlex(columns: readonly ColumnDef[]): string {
  let grow = 0;
  let basis = 0;
  for (const c of columns) {
    if (c.flex) grow += c.flex;
    else basis += c.width ?? 96;
  }
  return grow > 0 ? `flex:${grow} 1 ${basis}px;min-width:0;` : `flex:0 0 ${basis}px;`;
}
