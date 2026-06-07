import { describe, it, expect } from 'vitest';
import { extent, linePoints, linePath, areaPath, barRects, stackedBars, groupedBars, donutArcs } from './chart-math';

describe('extent', () => {
  it('guards empty and flat series', () => {
    expect(extent([])).toEqual({ min: 0, max: 1 });
    expect(extent([5, 5, 5])).toEqual({ min: 5, max: 6 }); // bumped so span ≠ 0
  });
  it('finds min/max and can include a baseline', () => {
    expect(extent([3, 7, 1])).toEqual({ min: 1, max: 7 });
    expect(extent([3, 7, 1], 0)).toEqual({ min: 0, max: 7 }); // baseline forces 0 in
  });
  it('ignores non-finite values', () => {
    expect(extent([2, NaN, 8, Infinity])).toEqual({ min: 2, max: 8 });
  });
});

describe('linePoints', () => {
  it('spreads points across the width and inverts y (max on top)', () => {
    const pts = linePoints([0, 10], 100, 40, 0);
    expect(pts[0]).toEqual({ x: 0, y: 40 }); // min value → bottom
    expect(pts[1]).toEqual({ x: 100, y: 0 }); // max value → top
  });
  it('returns [] for empty data', () => {
    expect(linePoints([], 100, 40)).toEqual([]);
  });
});

describe('linePath / areaPath', () => {
  it('builds an M/L polyline', () => {
    expect(linePath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M0 0 L10 5');
  });
  it('closes the area down to the baseline', () => {
    const d = areaPath([{ x: 0, y: 0 }, { x: 10, y: 5 }], 40);
    expect(d).toBe('M0 0 L10 5 L10 40 L0 40 Z');
  });
});

describe('barRects', () => {
  it('lays bars across the width from a zero baseline', () => {
    const rects = barRects([10, 20], 100, 40, 0, 0);
    expect(rects).toHaveLength(2);
    expect(rects[0].x).toBe(0);
    expect(rects[1].x).toBe(50);
    // The taller value occupies the full height; both anchor at the bottom (y+h=40).
    expect(rects[1].h).toBeGreaterThan(rects[0].h);
    expect(rects[1].y + rects[1].h).toBeCloseTo(40, 1);
  });
  it('draws negative bars below the zero axis', () => {
    const [pos, neg] = barRects([10, -10], 100, 40, 0, 0);
    expect(pos.y + pos.h).toBeCloseTo(neg.y, 1); // they meet at the zero axis
  });
});

describe('stackedBars', () => {
  // 2 series × 2 categories. Category totals: [3, 7]; max = 7.
  const series = [
    [1, 3],
    [2, 4],
  ];
  it('emits one segment per series per category', () => {
    expect(stackedBars(series, 100, 70, 0).length).toBe(4);
  });
  it('stacks segments to the category total (tallest category fills the height)', () => {
    const segs = stackedBars(series, 100, 70, 0, 0);
    // Category 1 total (7) is the max → its stack spans the full height (70).
    const cat1 = segs.filter((s) => s.category === 1);
    const stackH = cat1.reduce((a, s) => a + s.h, 0);
    expect(stackH).toBeCloseTo(70, 1);
    // Segments in a category share an x and don't overlap (stacked vertically).
    expect(cat1[0].x).toBe(cat1[1].x);
  });
  it('carries series/category/value metadata for tooltips', () => {
    const segs = stackedBars(series, 100, 70, 0, 0);
    expect(segs[0]).toMatchObject({ series: 0, category: 0, value: 1 });
  });
});

describe('groupedBars', () => {
  const series = [
    [1, 3],
    [2, 4],
  ];
  it('places series side by side within each category (distinct x, scaled to global max)', () => {
    const segs = groupedBars(series, 100, 70, 0, 0, 0);
    expect(segs.length).toBe(4);
    const cat0 = segs.filter((s) => s.category === 0);
    expect(cat0[0].x).not.toBe(cat0[1].x); // side by side
    // The global max value (4) fills the full height.
    expect(Math.max(...segs.map((s) => s.h))).toBeCloseTo(70, 1);
  });
});

describe('donutArcs', () => {
  it('emits one arc per positive value, summing to a full turn', () => {
    const arcs = donutArcs([1, 1, 2], 100, 20);
    expect(arcs).toHaveLength(3);
    expect(arcs.map((a) => a.fraction)).toEqual([0.25, 0.25, 0.5]);
    for (const a of arcs) expect(a.d).toMatch(/^M[-\d.]+ [-\d.]+ A/); // arc path
  });
  it('skips non-positive values', () => {
    expect(donutArcs([5, 0, -3], 100, 20)).toHaveLength(1);
    expect(donutArcs([0, 0], 100, 20)).toEqual([]);
  });
  it('renders a single 100% slice as a full ring (two sub-paths, not a degenerate arc)', () => {
    const [only] = donutArcs([42], 100, 20);
    expect(only.fraction).toBe(1);
    expect(only.d.match(/M/g)?.length).toBe(2); // outer + inner circle
  });
});
