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
});
