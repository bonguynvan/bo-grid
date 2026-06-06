import { describe, it, expect } from 'vitest';
import type { ColumnDef } from './column';
import { arrangePinned } from './pin';

const cols: ColumnDef[] = [
  { type: 'text', key: 'name', header: 'Name', width: 120 },
  { type: 'price', key: 'price', header: 'Price', width: 80, pinned: true },
  { type: 'volume', key: 'vol', header: 'Vol', width: 90 },
  { type: 'text', key: 'sym', header: 'Sym', width: 100, pinned: true },
];

describe('arrangePinned', () => {
  it('leaves order untouched when nothing is pinned', () => {
    const plain: ColumnDef[] = [{ type: 'text', key: 'a', header: 'A', width: 50 }];
    const r = arrangePinned(plain);
    expect(r.anyPinned).toBe(false);
    expect(r.columns).toEqual(plain);
    expect(r.totalWidth).toBe(50);
  });

  it('moves pinned columns to the front in original relative order', () => {
    const r = arrangePinned(cols);
    expect(r.columns.map((c) => c.key)).toEqual(['price', 'sym', 'name', 'vol']);
    expect(r.anyPinned).toBe(true);
  });

  it('computes cumulative sticky offsets for pinned columns only', () => {
    const r = arrangePinned(cols);
    // price (pinned, left 0, w80), sym (pinned, left 80, w100), name (not), vol (not)
    expect(r.info[0]).toMatchObject({ pinned: true, left: 0, width: 80 });
    expect(r.info[1]).toMatchObject({ pinned: true, left: 80, width: 100 });
    expect(r.info[2].pinned).toBe(false);
    expect(r.info[3].pinned).toBe(false);
    expect(r.totalWidth).toBe(120 + 80 + 90 + 100);
  });

  it('pins to the right edge with cumulative right offsets', () => {
    const c: ColumnDef[] = [
      { type: 'text', key: 'a', header: 'A', width: 100 },
      { type: 'number', key: 'b', header: 'B', width: 60, pinned: 'right' },
      { type: 'number', key: 'c', header: 'C', width: 80, pinned: 'right' },
    ];
    const r = arrangePinned(c);
    // unpinned first, then right-pinned in original order
    expect(r.columns.map((x) => x.key)).toEqual(['a', 'b', 'c']);
    expect(r.info[0]).toMatchObject({ pinned: false, side: null });
    // b sits left of c: its right offset clears c's width (80); c is flush (0)
    expect(r.info[1]).toMatchObject({ pinned: true, side: 'right', right: 80 });
    expect(r.info[2]).toMatchObject({ pinned: true, side: 'right', right: 0 });
  });

  it('supports left and right pins together', () => {
    const c: ColumnDef[] = [
      { type: 'text', key: 'sym', header: 'Sym', width: 100, pinned: 'left' },
      { type: 'number', key: 'mid', header: 'Mid', width: 90 },
      { type: 'number', key: 'act', header: 'Act', width: 70, pinned: 'right' },
    ];
    const r = arrangePinned(c);
    expect(r.columns.map((x) => x.key)).toEqual(['sym', 'mid', 'act']);
    expect(r.info[0]).toMatchObject({ side: 'left', left: 0 });
    expect(r.info[2]).toMatchObject({ side: 'right', right: 0 });
  });
});
