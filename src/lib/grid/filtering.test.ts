import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import {
  matchesFilter,
  isFilterActive,
  passesFilters,
  distinctValues,
  defaultFilterKind,
  emptyFilter,
  type ColumnFilter,
} from './filtering';

describe('isFilterActive', () => {
  it('treats empty/unset filters as inactive', () => {
    expect(isFilterActive(null)).toBe(false);
    expect(isFilterActive({ kind: 'text', op: 'contains', q: '   ' })).toBe(false);
    expect(isFilterActive({ kind: 'number', op: 'eq', a: NaN })).toBe(false);
    expect(isFilterActive({ kind: 'set', excluded: [] })).toBe(false);
  });
  it('requires both bounds for a between filter', () => {
    expect(isFilterActive({ kind: 'number', op: 'between', a: 1 })).toBe(false);
    expect(isFilterActive({ kind: 'number', op: 'between', a: 1, b: 5 })).toBe(true);
  });
  it('is active with a real query / value / exclusion', () => {
    expect(isFilterActive({ kind: 'text', op: 'contains', q: 'ab' })).toBe(true);
    expect(isFilterActive({ kind: 'number', op: 'gt', a: 0 })).toBe(true);
    expect(isFilterActive({ kind: 'set', excluded: ['x'] })).toBe(true);
  });
});

describe('matchesFilter — text', () => {
  it('handles every operator case-insensitively', () => {
    expect(matchesFilter('Apple', { kind: 'text', op: 'contains', q: 'ppl' })).toBe(true);
    expect(matchesFilter('Apple', { kind: 'text', op: 'notContains', q: 'xyz' })).toBe(true);
    expect(matchesFilter('Apple', { kind: 'text', op: 'equals', q: 'apple' })).toBe(true);
    expect(matchesFilter('Apple', { kind: 'text', op: 'starts', q: 'app' })).toBe(true);
    expect(matchesFilter('Apple', { kind: 'text', op: 'ends', q: 'PLE' })).toBe(true);
    expect(matchesFilter('Apple', { kind: 'text', op: 'equals', q: 'app' })).toBe(false);
  });
  it('an inactive (empty) filter passes everything', () => {
    expect(matchesFilter('anything', { kind: 'text', op: 'contains', q: '' })).toBe(true);
  });
});

describe('matchesFilter — number', () => {
  const cases: Array<[ColumnFilter, number, boolean]> = [
    [{ kind: 'number', op: 'eq', a: 10 }, 10, true],
    [{ kind: 'number', op: 'ne', a: 10 }, 11, true],
    [{ kind: 'number', op: 'lt', a: 10 }, 9, true],
    [{ kind: 'number', op: 'le', a: 10 }, 10, true],
    [{ kind: 'number', op: 'gt', a: 10 }, 11, true],
    [{ kind: 'number', op: 'ge', a: 10 }, 10, true],
    [{ kind: 'number', op: 'between', a: 5, b: 15 }, 10, true],
    [{ kind: 'number', op: 'between', a: 5, b: 15 }, 20, false],
    [{ kind: 'number', op: 'gt', a: 10 }, 10, false],
  ];
  it.each(cases)('%o against %d → %s', (f, v, expected) => {
    expect(matchesFilter(v, f)).toBe(expected);
  });
  it('excludes non-numeric values while active', () => {
    expect(matchesFilter('n/a', { kind: 'number', op: 'gt', a: 0 })).toBe(false);
    expect(matchesFilter(null, { kind: 'number', op: 'lt', a: 100 })).toBe(false);
  });
});

describe('matchesFilter — date (local calendar days)', () => {
  // Local-time constructors: a date cell shows the viewer's local day, so the
  // filter must match on that same day, in any time zone.
  const at = (d: number, h = 0, m = 0) => new Date(2024, 0, d, h, m).getTime();
  const day = (d: number) => new Date(2024, 0, d).getTime();
  it('on matches any time on that local day', () => {
    expect(matchesFilter(at(15, 0, 0), { kind: 'date', op: 'on', a: day(15) })).toBe(true);
    expect(matchesFilter(at(15, 23, 59), { kind: 'date', op: 'on', a: day(15) })).toBe(true);
    expect(matchesFilter(at(16, 0, 0), { kind: 'date', op: 'on', a: day(15) })).toBe(false);
  });
  it('before excludes the day itself', () => {
    expect(matchesFilter(at(14, 23, 59), { kind: 'date', op: 'before', a: day(15) })).toBe(true);
    expect(matchesFilter(at(15, 0, 1), { kind: 'date', op: 'before', a: day(15) })).toBe(false);
  });
  it('after excludes the day itself', () => {
    expect(matchesFilter(at(15, 23, 0), { kind: 'date', op: 'after', a: day(15) })).toBe(false);
    expect(matchesFilter(at(16, 0, 0), { kind: 'date', op: 'after', a: day(15) })).toBe(true);
  });
  it('between includes both end days', () => {
    expect(matchesFilter(at(15, 0, 0), { kind: 'date', op: 'between', a: day(15), b: day(20) })).toBe(true);
    expect(matchesFilter(at(20, 23, 59), { kind: 'date', op: 'between', a: day(15), b: day(20) })).toBe(true);
    expect(matchesFilter(at(21, 0, 0), { kind: 'date', op: 'between', a: day(15), b: day(20) })).toBe(false);
  });
});


describe('matchesFilter — set (excluded values)', () => {
  const f: ColumnFilter = { kind: 'set', excluded: ['Closed', 'Void'] };
  it('passes values that are not excluded', () => {
    expect(matchesFilter('Open', f)).toBe(true);
    expect(matchesFilter('Closed', f)).toBe(false);
  });
  it('coerces to string for membership', () => {
    expect(matchesFilter(5, { kind: 'set', excluded: ['5'] })).toBe(false);
  });
});

describe('passesFilters', () => {
  const row = { id: 1, name: 'Acme', px: 42, status: 'Open' } as unknown as GridRow;
  it('ANDs every active column filter', () => {
    const filters: Record<string, ColumnFilter> = {
      name: { kind: 'text', op: 'starts', q: 'ac' },
      px: { kind: 'number', op: 'gt', a: 40 },
    };
    expect(passesFilters(row, filters)).toBe(true);
    expect(passesFilters({ ...row, px: 10 }, filters)).toBe(false);
  });
  it('ignores inactive filters', () => {
    expect(passesFilters(row, { name: { kind: 'text', op: 'contains', q: '' } })).toBe(true);
  });
  it('filters a computed column through the value resolver', () => {
    // `total` is derived (qty*px), not a row field; resolver supplies it.
    const r = { id: 1, qty: 3, px: 10 } as unknown as GridRow;
    const valueOf = (row: GridRow, key: string) =>
      key === 'total' ? (row.qty as number) * (row.px as number) : row[key];
    const filters: Record<string, ColumnFilter> = { total: { kind: 'number', op: 'ge', a: 25 } };
    expect(passesFilters(r, filters, valueOf)).toBe(true); // 30 ≥ 25
    expect(passesFilters({ ...r, qty: 2 }, filters, valueOf)).toBe(false); // 20 < 25
  });
});

describe('distinctValues', () => {
  it('returns sorted unique strings (numeric-aware)', () => {
    const rows = [{ id: 1, n: 2 }, { id: 2, n: 10 }, { id: 3, n: 2 }] as unknown as GridRow[];
    expect(distinctValues(rows, 'n')).toEqual(['2', '10']);
  });
  it('resolves computed values via the resolver', () => {
    const rows = [{ id: 1, a: 1 }, { id: 2, a: 2 }] as unknown as GridRow[];
    const valueOf = (row: GridRow) => `#${row.a}`;
    expect(distinctValues(rows, 'tag', valueOf)).toEqual(['#1', '#2']);
  });
});

describe('defaultFilterKind / emptyFilter', () => {
  it('maps column type to a filter kind', () => {
    expect(defaultFilterKind({ type: 'text', key: 'a', header: 'A' } as ColumnDef)).toBe('text');
    expect(defaultFilterKind({ type: 'price', key: 'b', header: 'B' } as ColumnDef)).toBe('number');
    expect(defaultFilterKind({ type: 'date', key: 'c', header: 'C' } as ColumnDef)).toBe('date');
  });
  it('creates inactive starting filters', () => {
    expect(isFilterActive(emptyFilter('text'))).toBe(false);
    expect(isFilterActive(emptyFilter('number'))).toBe(false);
    expect(isFilterActive(emptyFilter('set'))).toBe(false);
  });
});

describe('custom filter types', () => {
  interface BandFilter {
    kind: 'band';
    bands: string[];
  }
  const bandOf = (v: unknown) => (Number(v) < 40 ? 'low' : Number(v) > 80 ? 'high' : 'mid');
  const Editor = (() => null) as never;
  const types = {
    band: {
      test: (value: unknown, f: BandFilter) => f.bands.includes(bandOf(value)),
      isActive: (f: BandFilter) => f.bands.length > 0,
      component: Editor,
    },
    always: { test: (value: unknown) => value === 'x', component: Editor },
  };

  it('uses the registered isActive', () => {
    expect(isFilterActive({ kind: 'band', bands: [] }, types)).toBe(false);
    expect(isFilterActive({ kind: 'band', bands: ['low'] }, types)).toBe(true);
  });

  it('treats a registered type without isActive as active', () => {
    expect(isFilterActive({ kind: 'always' }, types)).toBe(true);
  });

  it('treats an unregistered kind as inactive so it hides nothing', () => {
    expect(isFilterActive({ kind: 'nope', anything: 1 }, types)).toBe(false);
    expect(isFilterActive({ kind: 'band', bands: ['low'] })).toBe(false);
    const rows: GridRow[] = [{ id: 1, w: 10 }, { id: 2, w: 90 }];
    expect(rows.filter((r) => passesFilters(r, { w: { kind: 'nope' } }, undefined, types))).toHaveLength(2);
  });

  it('tests values through the registered type', () => {
    const f = { kind: 'band', bands: ['high'] };
    expect(matchesFilter(90, f, { id: 1 }, types)).toBe(true);
    expect(matchesFilter(10, f, { id: 1 }, types)).toBe(false);
  });

  it('passes the row to test', () => {
    const seen: GridRow[] = [];
    const t = { rowAware: { test: (_v: unknown, _f: unknown, row: GridRow) => (seen.push(row), true), component: Editor } };
    passesFilters({ id: 7, a: 1 }, { a: { kind: 'rowAware' } }, undefined, t);
    expect(seen[0].id).toBe(7);
  });

  it('ANDs custom and built-in filters', () => {
    const rows: GridRow[] = [
      { id: 1, w: 90, name: 'alpha' },
      { id: 2, w: 95, name: 'beta' },
      { id: 3, w: 10, name: 'alpha' },
    ];
    const filters = { w: { kind: 'band', bands: ['high'] }, name: { kind: 'text', op: 'contains', q: 'alp' } } as const;
    expect(rows.filter((r) => passesFilters(r, filters, undefined, types)).map((r) => r.id)).toEqual([1]);
  });

  it('leaves built-in behaviour unchanged when types are passed', () => {
    expect(isFilterActive({ kind: 'text', op: 'contains', q: 'a' }, types)).toBe(true);
    expect(matchesFilter('abc', { kind: 'text', op: 'contains', q: 'b' }, { id: 1 }, types)).toBe(true);
  });
});
