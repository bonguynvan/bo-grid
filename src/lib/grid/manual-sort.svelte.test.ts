// @vitest-environment jsdom
// `manualSort`: the app orders the rows; the grid only shows the sort.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow, SortState } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'number', key: 'oi', header: 'OI' },
];
// The app's own order for "OI descending", by rules the grid doesn't know:
// here BBB, with no figure, goes before DDD. The grid would put it last.
const appOrder = (): GridRow[] => [
  { id: 3, sym: 'CCC', oi: 50 },
  { id: 1, sym: 'AAA', oi: 50 },
  { id: 2, sym: 'BBB', oi: null },
  { id: 4, sym: 'DDD', oi: 10 },
];
const byOiDesc: SortState[] = [{ key: 'oi', dir: 'desc' }];

let m: MountedGrid | null = null;
afterEach(() => {
  m?.destroy();
  m = null;
  vi.useRealTimers();
});

const order = () =>
  [...m!.target.querySelectorAll('.spacer > .row')]
    .sort((a, b) => Number(a.getAttribute('aria-rowindex')) - Number(b.getAttribute('aria-rowindex')))
    .map((r) => r.querySelector('[aria-colindex="1"]')?.textContent?.trim());
const header = (i: number) => m!.target.querySelectorAll<HTMLElement>('[role=columnheader]')[i];

describe('manualSort', () => {
  it('keeps the rows in the order they come in, and shows the sort on the header', () => {
    m = mountGrid({ columns, rows: appOrder(), sort: byOiDesc, manualSort: true });
    expect(order()).toEqual(['CCC', 'AAA', 'BBB', 'DDD']);
    expect(header(1).getAttribute('aria-sort')).toBe('descending');
    expect(header(0).getAttribute('aria-sort')).toBe('none');
  });

  it('a header click calls onSortChange and reorders nothing', () => {
    const seen: SortState[][] = [];
    m = mountGrid({ columns, rows: appOrder(), manualSort: true, onSortChange: (s: SortState[]) => seen.push(s) });
    header(0).click();
    flushSync();
    expect(seen).toEqual([[{ key: 'sym', dir: 'asc' }]]);
    expect(order()).toEqual(['CCC', 'AAA', 'BBB', 'DDD']);
    // Uncontrolled: the grid holds the sort and marks the header.
    expect(header(0).getAttribute('aria-sort')).toBe('ascending');
  });

  it('without it, the grid sorts the same rows itself', () => {
    m = mountGrid({ columns, rows: appOrder(), sort: byOiDesc });
    expect(order()).toEqual(['CCC', 'AAA', 'DDD', 'BBB']);
  });

  it('still filters, and liveSort follows only the filter', () => {
    vi.useFakeTimers();
    m = mountGrid({ columns, rows: appOrder(), sort: byOiDesc, manualSort: true, liveSort: 100, filter: 'D' });
    expect(order()).toEqual(['DDD']);
    m.api().patchRows([[4, { oi: 999 }]]);
    vi.advanceTimersByTime(200);
    flushSync();
    expect(order()).toEqual(['DDD']);
  });
});
