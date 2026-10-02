import { describe, it, expect } from 'vitest';
import { patchRowsInPlace } from './patch';

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
