import { describe, it, expect } from 'vitest';
import { patchRowsInPlace, rowView } from './patch';

type R = { id: number; [k: string]: unknown };

const index = (rows: R[]) => new Map(rows.map((r) => [r.id, r]));
const asObj = (m: Map<number, Set<string>>) => Object.fromEntries([...m].map(([k, f]) => [k, [...f].sort()]));

describe('patchRowsInPlace', () => {
  it('writes onto the existing row objects and reports the fields that changed, per row', () => {
    const a = { id: 1, p: 10, v: 5 };
    const b = { id: 2, p: 20, v: 6 };
    const changed = patchRowsInPlace(index([a, b]), [
      [1, { p: 11, v: 5 }],
      [2, { p: 20 }], // same value — not a change
    ]);
    expect(a.p).toBe(11);
    expect(asObj(changed)).toEqual({ 1: ['p'] });
  });

  it('skips unknown keys and undefined fields', () => {
    const a = { id: 1, p: 10 };
    const changed = patchRowsInPlace(index([a]), [
      [9, { p: 1 }],
      [1, { p: undefined }],
    ]);
    expect(a.p).toBe(10);
    expect(changed.size).toBe(0);
  });

  it('treats NaN as equal to NaN (Object.is)', () => {
    const a = { id: 1, p: NaN };
    expect(patchRowsInPlace(index([a]), [[1, { p: NaN }]]).size).toBe(0);
  });

  it('merges repeated patches of one row', () => {
    const a = { id: 1, p: 1, v: 1 };
    const changed = patchRowsInPlace(index([a]), [
      [1, { p: 2 }],
      [1, { p: 3, v: 2 }],
    ]);
    expect(a.p).toBe(3);
    expect(asObj(changed)).toEqual({ 1: ['p', 'v'] });
  });

  it('accepts any iterable of entries, e.g. a Map', () => {
    const a = { id: 1, p: 1 };
    const changed = patchRowsInPlace(index([a]), new Map([[1, { p: 5 }]]));
    expect(a.p).toBe(5);
    expect(changed.get(1)?.has('p')).toBe(true);
  });
});

describe('rowView', () => {
  it('is a new object each time, reading the row’s current values', () => {
    const row: Record<string, unknown> = { id: 1, px: 10 };
    const a = rowView(row);
    const b = rowView(row);
    expect(a).not.toBe(b);
    expect(a).not.toBe(row);
    row.px = 11;
    expect(a.px).toBe(11);
  });

  it('runs getters and methods against the row itself (class rows with private fields)', () => {
    class Quote {
      #px = 10;
      get px() {
        return this.#px;
      }
      bump() {
        this.#px += 1;
        return this.#px;
      }
    }
    const q = new Quote();
    const v = rowView(q as unknown as Record<string, unknown>) as unknown as Quote;
    expect(v.px).toBe(10);
    expect(v.bump()).toBe(11);
    expect(q.px).toBe(11);
  });

  it('shows the row’s own fields to `in`, keys, spread and JSON', () => {
    const v = rowView({ id: 1, sym: 'AAA' });
    expect('sym' in v).toBe(true);
    expect(Object.keys(v)).toEqual(['id', 'sym']);
    expect({ ...v }).toEqual({ id: 1, sym: 'AAA' });
    expect(JSON.stringify(v)).toBe('{"id":1,"sym":"AAA"}');
  });

  it('writes through to the row', () => {
    const row: Record<string, unknown> = { id: 1, px: 10 };
    rowView(row).px = 12;
    expect(row.px).toBe(12);
  });
});
