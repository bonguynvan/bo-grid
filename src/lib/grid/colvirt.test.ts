import { describe, it, expect } from 'vitest';
import { columnWindow, columnOffsets, type ColRenderItem } from './colvirt';

const widths = [100, 100, 100, 100, 100, 100]; // 6 cols, total 600
const x = columnOffsets(widths); // [0,100,200,300,400,500]
const noPins = widths.map(() => false);

const cells = (items: ColRenderItem[]) => items.filter((i) => i.kind === 'cell').map((i) => (i as { ci: number }).ci);
const totalW = (items: ColRenderItem[]) =>
  items.reduce((a, i) => a + (i.kind === 'cell' ? widths[(i as { ci: number }).ci] : (i as { w: number }).w), 0);

describe('columnOffsets', () => {
  it('is a prefix sum of widths', () => {
    expect(columnOffsets([10, 20, 30])).toEqual([0, 10, 30]);
    expect(columnOffsets([])).toEqual([]);
  });
});

describe('columnWindow', () => {
  it('renders only columns intersecting the viewport (no overscan)', () => {
    // viewport [200,400): columns 2,3 (x 200,300).
    const items = columnWindow(x, widths, noPins, 200, 200, 0);
    expect(cells(items)).toEqual([2, 3]);
  });

  it('grows the window by the overscan on each side', () => {
    // viewport [200,400) + 100 overscan → [100,500): columns 1..4.
    expect(cells(columnWindow(x, widths, noPins, 200, 200, 100))).toEqual([1, 2, 3, 4]);
  });

  it('collapses off-window runs into spacers and preserves total width', () => {
    const items = columnWindow(x, widths, noPins, 300, 100, 0); // shows ~col 3
    // Leading spacer (cols before the window) + cell(s) + trailing spacer.
    expect(items[0].kind).toBe('spacer');
    expect(items[items.length - 1].kind).toBe('spacer');
    expect(totalW(items)).toBe(600); // exact total preserved
  });

  it('always renders pinned columns even when off-window', () => {
    const pins = [true, false, false, false, false, true]; // first + last pinned
    const items = columnWindow(x, widths, pins, 250, 100, 0);
    const rendered = cells(items);
    expect(rendered).toContain(0); // pinned-left, off-window
    expect(rendered).toContain(5); // pinned-right, off-window
    expect(totalW(items)).toBe(600);
  });

  it('renders everything when the viewport covers all columns', () => {
    expect(cells(columnWindow(x, widths, noPins, 0, 600, 0))).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
