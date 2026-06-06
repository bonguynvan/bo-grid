import { describe, it, expect } from 'vitest';
import { applyWidths, clampWidth, isResizable, MIN_COL_WIDTH } from './sizing';
import type { ColumnDef } from './column';

const col = (over: Partial<ColumnDef> & { key: string }): ColumnDef =>
  ({ type: 'number', header: over.key, ...over }) as ColumnDef;

describe('clampWidth', () => {
  it('rounds to whole pixels', () => {
    expect(clampWidth(120.6)).toBe(121);
  });
  it('enforces the minimum width', () => {
    expect(clampWidth(10)).toBe(MIN_COL_WIDTH);
    expect(clampWidth(-50)).toBe(MIN_COL_WIDTH);
  });
});

describe('isResizable', () => {
  it('is true by default when the grid allows it', () => {
    expect(isResizable(col({ key: 'a' }), true)).toBe(true);
  });
  it('respects a per-column opt-out', () => {
    expect(isResizable(col({ key: 'a', resizable: false }), true)).toBe(false);
  });
  it('is false when the grid disables resizing', () => {
    expect(isResizable(col({ key: 'a' }), false)).toBe(false);
  });
});

describe('applyWidths', () => {
  it('returns the same array reference when no overrides apply', () => {
    const cols = [col({ key: 'a' }), col({ key: 'b' })];
    expect(applyWidths(cols, {})).toBe(cols);
  });

  it('sets the overridden width and clears flex', () => {
    const cols = [col({ key: 'a', flex: 1 }), col({ key: 'b', width: 80 })];
    const out = applyWidths(cols, { a: 200 });
    expect(out[0].width).toBe(200);
    expect(out[0].flex).toBeUndefined();
    // untouched column passes through by reference
    expect(out[1]).toBe(cols[1]);
  });

  it('does not mutate the input columns', () => {
    const cols = [col({ key: 'a', flex: 1 })];
    applyWidths(cols, { a: 150 });
    expect(cols[0].flex).toBe(1);
    expect(cols[0].width).toBeUndefined();
  });

  it('applies overrides keyed by column key regardless of position', () => {
    const cols = [col({ key: 'a' }), col({ key: 'b' }), col({ key: 'c' })];
    const out = applyWidths(cols, { c: 120, a: 64 });
    expect(out[0].width).toBe(64);
    expect(out[2].width).toBe(120);
    expect(out[1]).toBe(cols[1]);
  });
});
