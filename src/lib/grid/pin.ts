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
 * `fitColumns`: scale every column with `available`, in proportion to its base
 * width, clamped to [its floor, its `maxWidth`]. A column that hits a bound
 * stays there and the others share what is left, as CSS flex does. Whole
 * pixels that add up to `available`; when even the floors do not fit, the
 * floors (and the grid scrolls).
 */
export function fitWidths(
  cols: readonly ColumnDef[],
  base: readonly number[],
  floors: readonly number[],
  available: number,
): number[] {
  const n = cols.length;
  const target = Math.floor(available);
  const cap = (i: number): number => Math.max(floors[i], cols[i].maxWidth ?? Infinity);
  if (floors.reduce((a, b) => a + b, 0) >= target) return floors.slice();
  const out = new Array<number>(n).fill(0);
  const frozen = new Array<boolean>(n).fill(false);
  let shares: number[] = [];
  for (;;) {
    const open = cols.flatMap((_, i) => (frozen[i] ? [] : [i]));
    const left = target - out.reduce((a, w, i) => a + (frozen[i] ? w : 0), 0);
    const weight = open.reduce((a, i) => a + base[i], 0);
    if (open.length === 0 || weight <= 0) break;
    shares = out.map((_, i) => (frozen[i] ? out[i] : (left * base[i]) / weight));
    // Freeze the columns a share pushes out of bounds, then share again.
    let moved = false;
    for (const i of open) {
      const bound = shares[i] < floors[i] ? floors[i] : shares[i] > cap(i) ? cap(i) : null;
      if (bound != null) {
        out[i] = bound;
        frozen[i] = true;
        moved = true;
      }
    }
    if (!moved) break;
  }
  // Whole pixels: round the open shares down, then hand out the remainder.
  const result = shares.length ? shares.map((w, i) => (frozen[i] ? out[i] : Math.floor(w))) : out.slice();
  let rest = target - result.reduce((a, b) => a + b, 0);
  for (let i = 0; rest > 0 && i < n; i++) {
    if (frozen[i]) continue;
    result[i] += 1;
    rest -= 1;
  }
  return result;
}

/**
 * Arrange columns for pinning: left-pinned columns move to the front, right-
 * pinned to the end, each with a cumulative sticky offset from its edge. When
 * nothing is pinned, column order is untouched and the grid stays fit-to-width.
 * With `available` (fixed-width mode), flex columns grow to fill it — or, with
 * `fitFloor` (`fitColumns`), every column scales to fit it (`fitWidths`).
 */
export function arrangePinned(
  cols: readonly ColumnDef[],
  available = 0,
  fitFloor?: (col: ColumnDef) => number,
): PinLayout {
  const left = cols.filter((c) => sideOf(c) === 'left');
  const right = cols.filter((c) => sideOf(c) === 'right');
  const mid = cols.filter((c) => sideOf(c) === null);
  const columns = left.length || right.length ? [...left, ...mid, ...right] : [...cols];
  const anyPinned = left.length > 0 || right.length > 0;

  const base = columns.map(baseWidth);
  const widths =
    available <= 0
      ? base
      : fitFloor
        ? fitWidths(columns, base, columns.map(fitFloor), available)
        : fillWidths(columns, base, available);
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
