import { describe, it, expect } from 'vitest';
import { GRID_STATE_VERSION, placeColumns, reconcileState, type GridState } from './state';

const base = (over: Partial<GridState> = {}): GridState => ({
  version: GRID_STATE_VERSION,
  order: ['a', 'b', 'c'],
  widths: {},
  hidden: [],
  pinned: {},
  sorts: [],
  filters: {},
  ...over,
});

describe('placeColumns', () => {
  it('keeps the arranged order for known keys', () => {
    expect(placeColumns(['c', 'a', 'b'], ['a', 'b', 'c'])).toEqual(['c', 'a', 'b']);
  });

  it('drops keys that are no longer declared and de-duplicates', () => {
    expect(placeColumns(['x', 'a', 'a', 'b'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('places a new column right after the nearest declared predecessor', () => {
    expect(placeColumns(['c', 'a'], ['a', 'n', 'c'])).toEqual(['c', 'a', 'n']);
  });

  it('places a new first column first', () => {
    expect(placeColumns(['a', 'b'], ['n', 'a', 'b'])).toEqual(['n', 'a', 'b']);
  });
});

describe('reconcileState', () => {
  it('returns null for a different version', () => {
    expect(reconcileState({ ...base(), version: 999 }, ['a', 'b', 'c'])).toBeNull();
  });

  it('returns null for non-objects', () => {
    expect(reconcileState(null, ['a'])).toBeNull();
    expect(reconcileState('nope', ['a'])).toBeNull();
    expect(reconcileState(42, ['a'])).toBeNull();
  });

  it('drops widths, hidden, pins, sorts and filters for removed columns', () => {
    const saved = base({
      order: ['a', 'b', 'gone'],
      widths: { a: 120, gone: 90 },
      hidden: ['b', 'gone'],
      pinned: { a: 'left', gone: 'right' },
      sorts: [
        { key: 'gone', dir: 'asc' },
        { key: 'a', dir: 'desc' },
      ],
      filters: { gone: { kind: 'text', op: 'contains', q: 'x' } },
    });
    const out = reconcileState(saved, ['a', 'b'])!;
    expect(out.order).toEqual(['a', 'b']);
    expect(out.widths).toEqual({ a: 120 });
    expect(out.hidden).toEqual(['b']);
    expect(out.pinned).toEqual({ a: 'left' });
    expect(out.sorts).toEqual([{ key: 'a', dir: 'desc' }]);
    expect(out.filters).toEqual({});
  });

  it('adds columns the saved state never knew about', () => {
    // c is declared after b, so it follows b wherever the user moved b
    const out = reconcileState(base({ order: ['b', 'a'] }), ['a', 'b', 'c'])!;
    expect(out.order).toEqual(['b', 'c', 'a']);
  });

  it('ignores malformed fields instead of throwing', () => {
    const out = reconcileState(
      { version: GRID_STATE_VERSION, order: 'x', widths: [], hidden: 'y', pinned: 1, sorts: {}, filters: [] },
      ['a'],
    )!;
    expect(out.order).toEqual(['a']);
    expect(out.widths).toEqual({});
    expect(out.hidden).toEqual([]);
    expect(out.pinned).toEqual({});
    expect(out.sorts).toEqual([]);
    expect(out.filters).toEqual({});
  });

  it('rejects non-positive or non-finite widths', () => {
    const out = reconcileState(base({ widths: { a: -5, b: NaN, c: 80 } }), ['a', 'b', 'c'])!;
    expect(out.widths).toEqual({ c: 80 });
  });

  it('keeps pinned row ids as given, deduplicated, and only when saved', () => {
    const out = reconcileState({ ...base(), pinnedRows: [3, 'x', 3, null, {}] }, ['a', 'b', 'c'])!;
    expect(out.pinnedRows).toEqual([3, 'x']);
    expect('pinnedRows' in reconcileState(base(), ['a', 'b', 'c'])!).toBe(false);
  });

  it('does not mutate its input', () => {
    const saved = base({ order: ['a', 'zzz'], hidden: ['zzz'] });
    const copy = JSON.parse(JSON.stringify(saved));
    reconcileState(saved, ['a']);
    expect(saved).toEqual(copy);
  });
});
