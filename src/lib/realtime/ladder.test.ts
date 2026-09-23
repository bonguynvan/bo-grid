import { describe, it, expect } from 'vitest';
import { centeredWindow } from './ladder';

describe('centeredWindow', () => {
  it('puts the extra row on the LOWER-INDEX side when visibleCount is even (10 = 5 below + center + 4 above)', () => {
    expect(centeredWindow(60, 30, 10)).toEqual({ start: 25, end: 35 });
  });

  it('splits evenly around the center when visibleCount is odd (11 = 5 below + center + 5 above)', () => {
    expect(centeredWindow(60, 30, 11)).toEqual({ start: 25, end: 36 });
  });

  it('clamps to the start of the array when the center is near index 0', () => {
    expect(centeredWindow(60, 2, 10)).toEqual({ start: 0, end: 10 });
  });

  it('clamps to the end of the array when the center is near the last index', () => {
    expect(centeredWindow(60, 58, 10)).toEqual({ start: 50, end: 60 });
  });

  it('returns the whole array when visibleCount >= totalCount', () => {
    expect(centeredWindow(8, 3, 10)).toEqual({ start: 0, end: 8 });
    expect(centeredWindow(8, 3, 8)).toEqual({ start: 0, end: 8 });
  });

  it('returns an empty window for an empty array', () => {
    expect(centeredWindow(0, 0, 10)).toEqual({ start: 0, end: 0 });
  });

  it('clamps a center index outside the array bounds instead of producing a nonsensical window', () => {
    expect(centeredWindow(60, -5, 10)).toEqual({ start: 0, end: 10 });
    expect(centeredWindow(60, 999, 10)).toEqual({ start: 50, end: 60 });
  });

  it('never returns a window wider than the array even at the very edges', () => {
    for (let center = 0; center < 60; center++) {
      const w = centeredWindow(60, center, 10);
      expect(w.end - w.start).toBeLessThanOrEqual(60);
      expect(w.start).toBeGreaterThanOrEqual(0);
      expect(w.end).toBeLessThanOrEqual(60);
      expect(w.start).toBeLessThanOrEqual(w.end);
    }
  });

  it('keeps the requested visible count everywhere the array is big enough to hold it', () => {
    for (let center = 0; center < 60; center++) {
      const w = centeredWindow(60, center, 10);
      expect(w.end - w.start).toBe(10);
    }
  });

  it('returns an empty (not inverted or negative) window for a zero or negative visibleCount', () => {
    expect(centeredWindow(60, 30, 0)).toEqual({ start: 0, end: 0 });
    expect(centeredWindow(60, 30, -2)).toEqual({ start: 0, end: 0 });
    expect(centeredWindow(5, 2, -2)).toEqual({ start: 0, end: 0 });
  });

  it('does not propagate NaN when centerIndex is non-finite — falls back rather than returning NaN bounds', () => {
    const w = centeredWindow(5, NaN, 3);
    expect(Number.isNaN(w.start)).toBe(false);
    expect(Number.isNaN(w.end)).toBe(false);
    expect(w.end - w.start).toBe(3);
  });

  it('rounds a fractional centerIndex to a whole index rather than returning fractional bounds', () => {
    const w = centeredWindow(10, 2.5, 4);
    expect(Number.isInteger(w.start)).toBe(true);
    expect(Number.isInteger(w.end)).toBe(true);
  });

  it('treats a non-finite totalCount or visibleCount as empty rather than throwing or returning garbage', () => {
    expect(centeredWindow(NaN, 0, 10)).toEqual({ start: 0, end: 0 });
    expect(centeredWindow(60, 0, NaN)).toEqual({ start: 0, end: 0 });
  });
});
