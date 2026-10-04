// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

// jsdom has no canvas: the grid falls back to ~7.5 px a character, which keeps
// these numbers predictable.
let grid: MountedGrid | null = null;
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  grid?.destroy();
  grid = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const headWidth = (key: string) => {
  const h = [...grid!.target.querySelectorAll('.head [role=columnheader]')].find((el) => el.textContent?.includes(key));
  return Number(/flex:\s*0\s+0\s+([\d.]+)px/.exec(h?.getAttribute('style') ?? '')?.[1]);
};
const tick = () => {
  vi.advanceTimersByTime(600);
  flushSync();
};

describe('autoWidth', () => {
  const columns: ColumnDef[] = [
    { type: 'text', key: 'sym', header: 'Sym', width: 80 },
    { type: 'number', key: 'vol', header: 'Vol', width: 60, autoWidth: true, format: (v) => String(v) },
  ];

  it('widens a column whose value on screen no longer fits', () => {
    const rows: GridRow[] = [{ id: 1, sym: 'AAA', vol: 12 }];
    grid = mountGrid({ rows, columns });
    tick();
    expect(headWidth('Vol')).toBe(60);
    grid.api().patchRows([[1, { vol: 123456789012 }]]); // 12 characters ≈ 90 px
    flushSync();
    tick();
    expect(headWidth('Vol')).toBeGreaterThan(90);
  });

  it('only grows: a narrower value later does not shrink it', () => {
    const rows: GridRow[] = [{ id: 1, sym: 'AAA', vol: 123456789012 }];
    grid = mountGrid({ rows, columns });
    tick();
    const wide = headWidth('Vol');
    grid.api().patchRows([[1, { vol: 5 }]]);
    flushSync();
    tick();
    expect(headWidth('Vol')).toBe(wide);
  });

  it('leaves columns without autoWidth alone', () => {
    const rows: GridRow[] = [{ id: 1, sym: 'A-VERY-LONG-SYMBOL-NAME', vol: 1 }];
    grid = mountGrid({ rows, columns });
    tick();
    expect(headWidth('Sym')).toBe(80);
  });
});
