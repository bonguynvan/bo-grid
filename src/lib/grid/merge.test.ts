import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { buildMergePlan, colSpanRow, combinedFlex } from './merge';

const text = (key: string, extra: Partial<ColumnDef> = {}): ColumnDef =>
  ({ type: 'text', key, header: key, ...extra }) as ColumnDef;

const rows = (...vals: Array<Record<string, unknown> | null>) => vals.map((v, i) => (v ? { id: i, ...v } : null));

function plan(columns: ColumnDef[], data: Array<GridRow | null>, extra: Partial<Parameters<typeof buildMergePlan>[0]> = {}) {
  return buildMergePlan({
    columns,
    count: data.length,
    rowAt: (i) => data[i],
    sectionOf: () => 0,
    ...extra,
  });
}

describe('buildMergePlan — spanRows', () => {
  it('returns null when no column merges', () => {
    expect(plan([text('a')], rows({ a: 1 }, { a: 1 }))).toBeNull();
  });

  it('joins adjacent equal values into one run', () => {
    const p = plan([text('acct', { spanRows: true })], rows({ acct: 'A' }, { acct: 'A' }, { acct: 'B' }))!;
    expect(p.runOf(0, 0)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(0, 1)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(0, 2)).toBeNull();
  });

  it('never joins non-adjacent equal values', () => {
    const p = plan([text('a', { spanRows: true })], rows({ a: 'x' }, { a: 'y' }, { a: 'x' }))!;
    expect(p.runOf(0, 0)).toBeNull();
    expect(p.runOf(0, 2)).toBeNull();
  });

  it('does not merge blank values', () => {
    const p = plan([text('a', { spanRows: true })], rows({ a: null }, { a: null }, { a: '' }, { a: '' }))!;
    for (let i = 0; i < 4; i++) expect(p.runOf(0, i)).toBeNull();
  });

  it('breaks a run at a non-data row', () => {
    const p = plan([text('a', { spanRows: true })], rows({ a: 'x' }, { a: 'x' }, null, { a: 'x' }, { a: 'x' }))!;
    expect(p.runOf(0, 1)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(0, 2)).toBeNull();
    expect(p.runOf(0, 3)).toEqual({ start: 3, end: 4 });
  });

  it('is hierarchical: a run breaks where a merged column to its left breaks', () => {
    const cols = [text('acct', { spanRows: true }), text('sym', { spanRows: true })];
    const data = rows({ acct: 'A', sym: 'X' }, { acct: 'A', sym: 'X' }, { acct: 'B', sym: 'X' }, { acct: 'B', sym: 'X' });
    const p = plan(cols, data)!;
    expect(p.runOf(1, 1)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(1, 2)).toEqual({ start: 2, end: 3 });
  });

  it('a non-merging column in between does not affect the hierarchy', () => {
    const cols = [text('acct', { spanRows: true }), text('qty'), text('sym', { spanRows: true })];
    const data = rows({ acct: 'A', qty: 1, sym: 'X' }, { acct: 'A', qty: 2, sym: 'X' });
    expect(plan(cols, data)!.runOf(2, 0)).toEqual({ start: 0, end: 1 });
  });

  it('accepts a comparator for adjacent rows', () => {
    const day = (r: GridRow) => String(r.ts).slice(0, 10);
    const cols = [text('ts', { spanRows: (a: GridRow, b: GridRow) => day(a) === day(b) })];
    const data = rows({ ts: '2026-01-01T09' }, { ts: '2026-01-01T10' }, { ts: '2026-01-02T09' });
    const p = plan(cols, data)!;
    expect(p.runOf(0, 0)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(0, 2)).toBeNull();
  });

  it('uses computed values for spanRows: true', () => {
    const cols = [text('k', { spanRows: true, value: (r: GridRow) => String(r.k).toUpperCase() })];
    const p = plan(cols, rows({ k: 'a' }, { k: 'A' }))!;
    expect(p.runOf(0, 0)).toEqual({ start: 0, end: 1 });
  });

  it('honours breakAfter (e.g. an expanded detail row)', () => {
    const p = plan([text('a', { spanRows: true })], rows({ a: 'x' }, { a: 'x' }, { a: 'x' }), {
      breakAfter: (i) => i === 0,
    })!;
    expect(p.runOf(0, 0)).toBeNull();
    expect(p.runOf(0, 1)).toEqual({ start: 1, end: 2 });
  });

  it('returns null for columns that do not span', () => {
    const p = plan([text('a'), text('b', { spanRows: true })], rows({ a: 1, b: 1 }, { a: 1, b: 1 }))!;
    expect(p.runOf(0, 0)).toBeNull();
    expect(p.runOf(1, 0)).toEqual({ start: 0, end: 1 });
  });
});

describe('colSpanRow', () => {
  const cols = [
    text('a', { colSpan: (r: GridRow) => (r.note ? 3 : 1) }),
    text('b'),
    text('c', { colSpan: () => 2 }),
    text('d'),
  ];

  it('returns null when nothing in the row spans', () => {
    expect(colSpanRow([text('a'), text('b')], { id: 1 }, () => 0)).toBeNull();
    expect(colSpanRow([text('a', { colSpan: () => 1 }), text('b')], { id: 1 }, () => 0)).toBeNull();
  });

  it('marks covered columns with 0', () => {
    expect(Array.from(colSpanRow(cols, { id: 1, note: true }, () => 0)!)).toEqual([3, 0, 0, 1]);
  });

  it('lets the leftmost claim win', () => {
    // a covers b and c, so c never starts its own span
    expect(Array.from(colSpanRow(cols, { id: 1, note: true }, () => 0)!)[2]).toBe(0);
  });

  it('clamps at the last column', () => {
    expect(Array.from(colSpanRow([text('a', { colSpan: () => 9 }), text('b')], { id: 1 }, () => 0)!)).toEqual([2, 0]);
    expect(colSpanRow([text('a'), text('b', { colSpan: () => 9 })], { id: 1 }, () => 0)).toBeNull();
  });

  it('clamps at a pin-section boundary', () => {
    const sec = (ci: number) => (ci < 2 ? 0 : 1);
    const c2 = [text('a', { colSpan: () => 4 }), text('b'), text('c'), text('d')];
    expect(Array.from(colSpanRow(c2, { id: 1 }, sec)!)).toEqual([2, 0, 1, 1]);
  });

  it('treats invalid counts as 1', () => {
    const c2 = [text('a', { colSpan: () => NaN }), text('b', { colSpan: () => -3 }), text('c')];
    expect(colSpanRow(c2, { id: 1 }, () => 0)).toBeNull();
  });
});

describe('buildMergePlan — colSpan', () => {
  const cols = [text('acct', { spanRows: true }), text('sym', { colSpan: (r: GridRow) => (r.note ? 2 : 1) }), text('px', { spanRows: true })];

  it('exposes per-row column spans', () => {
    const p = plan(cols, rows({ acct: 'A', sym: 's', px: 1 }, { acct: 'A', note: true, px: 1 }))!;
    expect(p.colSpansOf(0)).toBeNull();
    expect(Array.from(p.colSpansOf(1)!)).toEqual([1, 2, 0]);
  });

  it('a covered cell breaks the covered column run but not a column to its left', () => {
    const data = rows({ acct: 'A', px: 1 }, { acct: 'A', note: true, px: 1 }, { acct: 'A', px: 1 });
    const p = plan(cols, data)!;
    expect(p.runOf(0, 0)).toEqual({ start: 0, end: 2 }); // acct keeps merging through the note row
    expect(p.runOf(2, 0)).toBeNull(); // px is covered on row 1
    expect(p.runOf(2, 1)).toBeNull();
    expect(p.runOf(2, 2)).toBeNull();
  });

  it('is skipped entirely when colSpan is disabled', () => {
    const p = plan(cols, rows({ acct: 'A', note: true, px: 1 }), { colSpan: false })!;
    expect(p.colSpansOf(0)).toBeNull();
  });

  it('a column with both spanRows and colSpan only joins rows with the same width', () => {
    const both = [text('a', { spanRows: true, colSpan: (r: GridRow) => (r.wide ? 2 : 1) }), text('b')];
    const p = plan(both, rows({ a: 'x', wide: true }, { a: 'x', wide: true }, { a: 'x' }))!;
    expect(p.runOf(0, 0)).toEqual({ start: 0, end: 1 });
    expect(p.runOf(0, 2)).toBeNull();
  });
});

describe('combinedFlex', () => {
  it('sums fixed widths into the basis', () => {
    expect(combinedFlex([text('a', { width: 100 }), text('b', { width: 50 })])).toBe('flex:0 0 150px;');
  });

  it('sums grow weights of flex columns', () => {
    expect(combinedFlex([text('a', { flex: 1 }), text('b', { flex: 2 })])).toBe('flex:3 1 0px;min-width:0;');
  });

  it('mixes fixed and flex columns', () => {
    expect(combinedFlex([text('a', { width: 80 }), text('b', { flex: 1 })])).toBe('flex:1 1 80px;min-width:0;');
  });

  it('defaults a column without width to 96px', () => {
    expect(combinedFlex([text('a'), text('b')])).toBe('flex:0 0 192px;');
  });
});
