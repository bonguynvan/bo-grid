import { describe, it, expect } from 'vitest';
import { compareBySorts, type GridRow, type SortState } from './column';

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
