import { describe, it, expect } from 'vitest';
import { Selection } from './selection.svelte';

describe('Selection', () => {
  it('starts empty', () => {
    const s = new Selection();
    expect(s.bounds).toBeNull();
    expect(s.count).toBe(0);
  });

  it('normalizes bounds regardless of drag direction', () => {
    const s = new Selection();
    s.start(3, 4);
    s.extendTo(1, 2); // drag up-left
    expect(s.bounds).toEqual({ r0: 1, r1: 3, c0: 2, c1: 4 });
    expect(s.count).toBe(9);
  });

  it('contains and isFocus reflect the rectangle and focus corner', () => {
    const s = new Selection();
    s.start(0, 0);
    s.extendTo(2, 2);
    expect(s.contains(1, 1)).toBe(true);
    expect(s.contains(3, 1)).toBe(false);
    expect(s.isFocus(2, 2)).toBe(true);
    expect(s.isFocus(0, 0)).toBe(false);
  });

  it('move extends or collapses, clamped to bounds', () => {
    const s = new Selection();
    s.start(0, 0);
    s.move(1, 1, true, 5, 5); // extend to (1,1)
    expect(s.count).toBe(4);
    s.move(-5, 0, false, 5, 5); // collapse, clamp at row 0
    expect(s.bounds).toEqual({ r0: 0, r1: 0, c0: 1, c1: 1 });
  });

  it('selectAll spans the whole grid; clear resets', () => {
    const s = new Selection();
    s.selectAll(4, 3);
    expect(s.bounds).toEqual({ r0: 0, r1: 3, c0: 0, c1: 2 });
    s.clear();
    expect(s.bounds).toBeNull();
  });
});
