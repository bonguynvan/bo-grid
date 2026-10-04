import type { ColumnDef } from './column';

/** Smallest width (px) a column may be dragged to. */
export const MIN_COL_WIDTH = 48;

/** User width overrides, keyed by column `key` so they survive reorder/pin. */
export type WidthMap = Record<string, number>;

/** Clamp + round a proposed drag width to [min, max], never below MIN_COL_WIDTH. */
export function clampWidth(w: number, min = MIN_COL_WIDTH, max = Infinity): number {
  const lo = Math.max(MIN_COL_WIDTH, min);
  return Math.min(Math.max(Math.round(w), lo), Math.max(lo, max));
}

/** Whether a column may be resized, given the grid-level toggle. */
export function isResizable(col: ColumnDef, gridResizable: boolean): boolean {
  return gridResizable && col.resizable !== false;
}

/**
 * Apply width overrides to a column list. An overridden column becomes
 * fixed-width (its `flex` cleared) so the dragged size sticks; in fit-to-width
 * mode the remaining flex columns absorb the difference. Untouched columns pass
 * through by reference, so the default fit-to-width layout is unchanged when no
 * column has been resized.
 */
export function applyWidths(cols: readonly ColumnDef[], widths: WidthMap): ColumnDef[] {
  let changed = false;
  const out = cols.map((c) => {
    const w = widths[c.key];
    if (w == null) return c;
    changed = true;
    return { ...c, width: w, flex: undefined } as ColumnDef;
  });
  return changed ? out : (cols as ColumnDef[]);
}

/**
 * `autoWidth`: raise columns to the content widths measured on screen. A fixed
 * column grows to the measured width (never below its own), a flex column's
 * floor rises and it keeps flexing; both stop at `maxWidth`. Columns the user
 * sized (`overrides`) and columns without `autoWidth` pass through by
 * reference, and so does the list when nothing changes.
 */
export function applyAutoWidths(
  cols: readonly ColumnDef[],
  measured: Readonly<Record<string, number>>,
  overrides: WidthMap,
): ColumnDef[] {
  let changed = false;
  const out = cols.map((c) => {
    const m = measured[c.key];
    if (!c.autoWidth || m == null || overrides[c.key] != null) return c;
    const need = Math.min(m, c.maxWidth ?? Infinity);
    const floor = Math.max(c.minWidth ?? 0, need);
    if (c.flex) {
      if (floor === (c.minWidth ?? 0)) return c;
      changed = true;
      return { ...c, minWidth: floor } as ColumnDef;
    }
    const width = Math.max(c.width ?? 96, need);
    if (width === c.width && floor === c.minWidth) return c;
    changed = true;
    return { ...c, width, minWidth: floor } as ColumnDef;
  });
  return changed ? out : (cols as ColumnDef[]);
}

/** The width that fits every text: the widest, measured, plus padding. */
export function contentWidth(texts: Iterable<string>, measure: (text: string) => number, pad: number): number {
  let max = 0;
  for (const t of texts) max = Math.max(max, measure(t));
  return Math.ceil(max) + pad;
}
