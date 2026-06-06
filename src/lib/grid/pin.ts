import type { ColumnDef } from './column';
import { colWidth } from './column';

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
 * Arrange columns for pinning: left-pinned columns move to the front, right-
 * pinned to the end, each with a cumulative sticky offset from its edge. When
 * nothing is pinned, column order is untouched and the grid stays fit-to-width.
 */
export function arrangePinned(cols: readonly ColumnDef[]): PinLayout {
  const left = cols.filter((c) => sideOf(c) === 'left');
  const right = cols.filter((c) => sideOf(c) === 'right');
  const mid = cols.filter((c) => sideOf(c) === null);
  const columns = left.length || right.length ? [...left, ...mid, ...right] : [...cols];
  const anyPinned = left.length > 0 || right.length > 0;

  const widths = columns.map(colWidth);
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
