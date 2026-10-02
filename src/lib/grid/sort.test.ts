import { describe, it, expect } from 'vitest';
import { compareBySorts, sortRows, type GridRow, type SortState } from './column';

const row = (over: Record<string, unknown>): GridRow =>
  ({ id: 0, flashSeq: 0, flashDir: 'up', ...over }) as GridRow;

describe('compareBySorts', () => {
  it('returns 0 for an empty sort list (preserves order)', () => {
    expect(compareBySorts(row({ a: 1 }), row({ a: 2 }), [])).toBe(0);
  });

  it('sorts by a single key, honouring direction', () => {
    const asc: SortState[] = [{ key: 'a', dir: 'asc' }];
    const desc: SortState[] = [{ key: 'a', dir: 'desc' }];
    expect(compareBySorts(row({ a: 1 }), row({ a: 2 }), asc)).toBeLessThan(0);
    expect(compareBySorts(row({ a: 1 }), row({ a: 2 }), desc)).toBeGreaterThan(0);
  });

  it('falls through to the secondary key when the primary ties', () => {
    const sorts: SortState[] = [
      { key: 'group', dir: 'asc' },
      { key: 'score', dir: 'desc' },
    ];
    // same group → decided by score descending
    expect(compareBySorts(row({ group: 'A', score: 5 }), row({ group: 'A', score: 9 }), sorts)).toBeGreaterThan(0);
    // different group → decided by group, score ignored
    expect(compareBySorts(row({ group: 'A', score: 1 }), row({ group: 'B', score: 9 }), sorts)).toBeLessThan(0);
  });

  it('uses a column custom comparator when provided', () => {
    const order = ['low', 'mid', 'high'];
    const colOf = () => ({ compare: (a: unknown, b: unknown) => order.indexOf(String(a)) - order.indexOf(String(b)) }) as never;
    const sorts: SortState[] = [{ key: 'level', dir: 'asc' }];
    // alphabetical would put 'high' first; the custom comparator keeps low<mid<high
    expect(compareBySorts(row({ level: 'low' }), row({ level: 'high' }), sorts, colOf)).toBeLessThan(0);
    expect(compareBySorts(row({ level: 'high' }), row({ level: 'low' }), sorts, colOf)).toBeGreaterThan(0);
  });

  it('produces a stable multi-key ordering when used with Array.sort', () => {
    const rows = [
      row({ team: 'B', pts: 3 }),
      row({ team: 'A', pts: 1 }),
      row({ team: 'B', pts: 9 }),
      row({ team: 'A', pts: 4 }),
    ];
    const sorts: SortState[] = [
      { key: 'team', dir: 'asc' },
      { key: 'pts', dir: 'desc' },
    ];
    const out = [...rows].sort((a, b) => compareBySorts(a, b, sorts)).map((r) => `${r.team}${r.pts}`);
    expect(out).toEqual(['A4', 'A1', 'B9', 'B3']);
  });
});

describe('sortRows (keys read once per row)', () => {
  const cols = [
    { type: 'number', key: 'p', header: 'P' },
    { type: 'text', key: 's', header: 'S' },
    { type: 'number', key: 'pct', header: '%', value: (r: GridRow) => Number(r.p) / Number(r.ref) },
    { type: 'text', key: 'grade', header: 'G', compare: (a: unknown, b: unknown) => ['A', 'B', 'C'].indexOf(String(a)) - ['A', 'B', 'C'].indexOf(String(b)) },
  ] as const;
  const data = [
    row({ id: 1, p: 30, s: 'b', ref: 10, grade: 'C' }),
    row({ id: 2, p: 10, s: 'a', ref: 10, grade: 'A' }),
    row({ id: 3, p: 20, s: 'b', ref: 5, grade: 'B' }),
    row({ id: 4, p: 20, s: 'a', ref: 40, grade: 'A' }),
  ];
  const ids = (rs: GridRow[]) => rs.map((r) => r.id);

  it('returns the input untouched for an empty sort list', () => {
    expect(sortRows(data, [], cols as never)).toBe(data);
  });

  it('matches compareBySorts on single and multi-key sorts', () => {
    for (const sorts of [
      [{ key: 'p', dir: 'asc' }],
      [{ key: 'p', dir: 'desc' }],
      [{ key: 's', dir: 'asc' }, { key: 'p', dir: 'desc' }],
    ] as SortState[][]) {
      const colOf = (k: string) => (cols as readonly { key: string }[]).find((c) => c.key === k) as never;
      const expected = [...data].sort((a, b) => compareBySorts(a, b, sorts, colOf));
      expect(ids(sortRows(data, sorts, cols as never))).toEqual(ids(expected));
    }
  });

  it('sorts computed columns by their derived value, reading it once per row', () => {
    let calls = 0;
    const counted = [{ ...cols[2], value: (r: GridRow) => (calls++, Number(r.p) / Number(r.ref)) }];
    expect(ids(sortRows(data, [{ key: 'pct', dir: 'desc' }], counted as never))).toEqual([3, 1, 2, 4]);
    expect(calls).toBe(data.length);
  });

  it('honours a column compare function', () => {
    expect(ids(sortRows(data, [{ key: 'grade', dir: 'asc' }], cols as never))).toEqual([2, 4, 3, 1]);
  });

  it('is stable for equal keys', () => {
    expect(ids(sortRows(data, [{ key: 'p', dir: 'asc' }], cols as never))).toEqual([2, 3, 4, 1]);
  });

  it('does not mutate the input array', () => {
    const copy = [...data];
    sortRows(data, [{ key: 'p', dir: 'asc' }], cols as never);
    expect(data).toEqual(copy);
  });
});
