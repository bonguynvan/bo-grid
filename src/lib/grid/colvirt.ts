// Column (horizontal) virtualization math. Pure + unit-tested; the Grid maps the
// result to <Cell> / spacer elements. Off-window runs of columns collapse into a
// single spacer of their summed width so positions/total width stay exact.

export type ColRenderItem = { kind: 'cell'; ci: number } | { kind: 'spacer'; w: number };

/**
 * Given each column's x-offset (`x`) and `widths`, which columns are `pinned`
 * (always rendered), and the horizontal viewport (`scrollLeft`..`+viewW`, grown
 * by `overscan` px each side), return the render items in column order.
 */
export function columnWindow(
  x: readonly number[],
  widths: readonly number[],
  pinned: readonly boolean[],
  scrollLeft: number,
  viewW: number,
  overscan: number,
): ColRenderItem[] {
  const n = widths.length;
  const lo = scrollLeft - overscan;
  const hi = scrollLeft + viewW + overscan;
  const out: ColRenderItem[] = [];
  let pending = 0;
  const flush = (): void => {
    if (pending > 0) {
      out.push({ kind: 'spacer', w: pending });
      pending = 0;
    }
  };
  for (let ci = 0; ci < n; ci++) {
    const visible = pinned[ci] || (x[ci] + widths[ci] > lo && x[ci] < hi);
    if (visible) {
      flush();
      out.push({ kind: 'cell', ci });
    } else {
      pending += widths[ci];
    }
  }
  flush();
  return out;
}

/** Prefix-sum of column widths → each column's left x-offset. */
export function columnOffsets(widths: readonly number[]): number[] {
  const xs: number[] = [];
  let x = 0;
  for (const w of widths) {
    xs.push(x);
    x += w;
  }
  return xs;
}
