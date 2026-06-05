import { describe, it, expect } from 'vitest';
import { uniformHeights, variableHeights } from './rowheight';

describe('uniformHeights', () => {
  it('computes total, offsets, and index from offset', () => {
    const m = uniformHeights(10, 36);
    expect(m.total).toBe(360);
    expect(m.offsetOf(3)).toBe(108);
    expect(m.heightOf(0)).toBe(36);
    expect(m.indexAt(0)).toBe(0);
    expect(m.indexAt(108)).toBe(3);
    expect(m.indexAt(125)).toBe(3);
    expect(m.indexAt(99999)).toBe(9); // clamped to last
  });

  it('handles an empty model', () => {
    const m = uniformHeights(0, 36);
    expect(m.total).toBe(0);
    expect(m.indexAt(50)).toBe(0);
  });
});

describe('variableHeights', () => {
  const m = variableHeights([40, 60, 20, 80]); // offsets: 0, 40, 100, 120, total 200

  it('accumulates prefix offsets and total', () => {
    expect(m.total).toBe(200);
    expect(m.offsetOf(0)).toBe(0);
    expect(m.offsetOf(1)).toBe(40);
    expect(m.offsetOf(2)).toBe(100);
    expect(m.offsetOf(3)).toBe(120);
    expect(m.heightOf(2)).toBe(20);
  });

  it('binary-searches the row containing an offset', () => {
    expect(m.indexAt(0)).toBe(0);
    expect(m.indexAt(39)).toBe(0);
    expect(m.indexAt(40)).toBe(1); // exact boundary -> next row
    expect(m.indexAt(99)).toBe(1);
    expect(m.indexAt(100)).toBe(2);
    expect(m.indexAt(150)).toBe(3);
    expect(m.indexAt(9999)).toBe(3);
  });
});
