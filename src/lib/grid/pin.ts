import type { ColumnDef } from './column';
import { baseWidth } from './column';

export type PinSide = 'left' | 'right';

export interface PinInfo {
  pinned: boolean;
  /** Which edge the column is pinned to, or null when not pinned. */
  side: PinSide | null;
  /** Sticky `left` offset (px) when side === 'left'. */
  left: number;
  /** Sticky `right` offset (px) when side === 'right'. */
  right: number;
  /** Concrete width (px). */
  width: number;
}

export interface PinLayout {
  /** Columns reordered: left-pinned first, then unpinned, then right-pinned. */
  columns: ColumnDef[];
  info: PinInfo[];
  /** Sum of all column widths (the horizontally-scrollable content width). */
  totalWidth: number;
  anyPinned: boolean;
}

function sideOf(c: ColumnDef): PinSide | null {
  if (c.pinned === 'right') return 'right';
  if (c.pinned) return 'left'; // true | 'left'
  return null;
}

/**
 * Grow flex columns (by weight, capped at `maxWidth`) so the widths add up to
 * `available`. Whole pixels, so the sum lands exactly on the target and never
 * spills into a stray horizontal scrollbar; never shrinks a column.
 */
export function fillWidths(cols: readonly ColumnDef[], base: readonly number[], available: number): number[] {
  const out = base.slice();
  const cap = (i: number): number => cols[i].maxWidth ?? Infinity;
  let extra = Math.floor(available) - out.reduce((a, b) => a + b, 0);
  let open = cols.flatMap((c, i) => (c.flex ? [i] : []));
  while (extra > 0 && open.length) {
    const weight = open.reduce((a, i) => a + (cols[i].flex as number), 0);
    let given = 0;
    for (const i of open) {
      const add = Math.min(Math.floor((extra * (cols[i].flex as number)) / weight), cap(i) - out[i]);
      out[i] += add;
      given += add;
    }
    if (given === 0) {
      // Shares rounded down to nothing: hand out the last pixels one by one.
      for (const i of open) {
        if (given >= extra) break;
        out[i] += 1;
        given += 1;
      }
    }
    extra -= given;
    open = open.filter((i) => out[i] < cap(i));
  }
  return out;
}

/**
 * Arrange columns for pinning: left-pinned columns move to the front, right-
 * pinned to the end, each with a cumulative sticky offset from its edge. When
 * nothing is pinned, column order is untouched and the grid stays fit-to-width.
 * With `available` (fixed-width mode), flex columns grow to fill it.
 */
export function arrangePinned(cols: readonly ColumnDef[], available = 0): PinLayout {
  const left = cols.filter((c) => sideOf(c) === 'left');
  const right = cols.filter((c) => sideOf(c) === 'right');
  const mid = cols.filter((c) => sideOf(c) === null);
  const columns = left.length || right.length ? [...left, ...mid, ...right] : [...cols];
  const anyPinned = left.length > 0 || right.length > 0;

  const base = columns.map(baseWidth);
  const widths = available > 0 ? fillWidths(columns, base, available) : base;
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  const nLeft = left.length;
  const nRight = right.length;
  const firstRight = columns.length - nRight;

  const info: PinInfo[] = [];
  let leftOff = 0;
  for (let i = 0; i < columns.length; i++) {
    const width = widths[i];
    if (i < nLeft) {
      info.push({ pinned: true, side: 'left', left: leftOff, right: 0, width });
      leftOff += width;
    } else if (i >= firstRight) {
      info.push({ pinned: true, side: 'right', left: 0, right: 0, width }); // right filled below
    } else {
      info.push({ pinned: false, side: null, left: 0, right: 0, width });
    }
  }
  // Right offsets accumulate from the right edge inward.
  let rightOff = 0;
  for (let i = columns.length - 1; i >= firstRight; i--) {
    info[i].right = rightOff;
    rightOff += widths[i];
  }
  return { columns, info, totalWidth, anyPinned };
}
