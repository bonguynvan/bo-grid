/**
 * Row-height model for the virtualizer. Two implementations behind one
 * interface: a uniform O(1) model (the default fast path) and a variable model
 * backed by prefix sums + binary search. The grid positions rows via offsetOf()
 * and finds the first visible row via indexAt(), so it doesn't care which.
 */
export interface HeightModel {
  readonly total: number;
  readonly count: number;
  /** Pixel offset (top) of the row at `index`. */
  offsetOf(index: number): number;
  heightOf(index: number): number;
  /** Index of the row whose vertical span contains `offset`. */
  indexAt(offset: number): number;
}

export function uniformHeights(count: number, h: number): HeightModel {
  const safe = h > 0 ? h : 1;
  return {
    total: count * safe,
    count,
    offsetOf: (i) => i * safe,
    heightOf: () => safe,
    indexAt: (offset) => {
      if (count === 0) return 0;
      return Math.max(0, Math.min(count - 1, Math.floor(offset / safe)));
    },
  };
}

export function variableHeights(heights: readonly number[]): HeightModel {
  const n = heights.length;
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + Math.max(0, heights[i]);
  return {
    total: prefix[n],
    count: n,
    offsetOf: (i) => prefix[Math.max(0, Math.min(n, i))],
    heightOf: (i) => (i >= 0 && i < n ? heights[i] : 0),
    indexAt: (offset) => {
      if (n === 0) return 0;
      // largest i with prefix[i] <= offset
      let lo = 0;
      let hi = n - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (prefix[mid] <= offset) lo = mid;
        else hi = mid - 1;
      }
      return lo;
    },
  };
}
