import { describe, it, expect } from 'vitest';
import type { ColumnDef, CellTypeDef } from './column';
import { resolveColumns } from './celltype';
import { formatCell, isNumeric, compareBySorts } from './column';

const Fake = (() => null) as unknown as NonNullable<CellTypeDef['component']>;

describe('resolveColumns', () => {
  it('returns the same array when nothing needs resolving', () => {
    const cols: ColumnDef[] = [{ type: 'text', key: 'a', header: 'A' }];
    expect(resolveColumns(cols)).toBe(cols);
    expect(resolveColumns(cols, { money: { extends: 'number' } })).toBe(cols);
  });

  it('applies a registered type as defaults under the column’s own fields', () => {
    const types: Record<string, CellTypeDef> = {
      money: { extends: 'number', decimals: 0, width: 120, format: (v) => `$${v}` },
    };
    const [c] = resolveColumns([{ cellType: 'money', key: 'p', header: 'P', width: 90 }], types);
    expect(c.type).toBe('number');
    expect(c.width).toBe(90);
    expect(formatCell(c, 5)).toBe('$5');
    expect(isNumeric(c)).toBe(true);
  });

  it('inherits built-in sorting through extends', () => {
    const [c] = resolveColumns([{ cellType: 'qty', key: 'q', header: 'Q' }], { qty: { extends: 'number' } });
    const rows = [{ id: 1, q: 10 }, { id: 2, q: 9 }];
    const sorted = [...rows].sort((x, y) => compareBySorts(x, y, [{ key: 'q', dir: 'asc' }], () => c));
    expect(sorted.map((r) => r.q)).toEqual([9, 10]);
  });

  it('defaults to custom when the type draws itself, text otherwise', () => {
    const types: Record<string, CellTypeDef> = { pill: { component: Fake }, plain: { align: 'right' } };
    const [a, b] = resolveColumns(
      [
        { cellType: 'pill', key: 'a', header: 'A' },
        { cellType: 'plain', key: 'b', header: 'B' },
      ],
      types,
    );
    expect(a.type).toBe('custom');
    expect(a.component).toBe(Fake);
    expect(b.type).toBe('text');
    expect(b.align).toBe('right');
  });

  it('renders an unregistered type as text instead of failing', () => {
    const [c] = resolveColumns([{ cellType: 'nope', key: 'a', header: 'A' }]);
    expect(c.type).toBe('text');
    expect(formatCell(c, 'x')).toBe('x');
  });

  it('passes type-specific options through from the column', () => {
    const [c] = resolveColumns([{ cellType: 'pct', key: 'a', header: 'A', decimals: 3 }], { pct: { extends: 'number' } });
    expect(formatCell(c, 1.23456)).toBe('1.235');
  });

  it('injects the grid locale where a column has none', () => {
    const cols: ColumnDef[] = [
      { type: 'price', key: 'a', header: 'A' },
      { type: 'price', key: 'b', header: 'B', locale: 'en-US' },
    ];
    const [a, b] = resolveColumns(cols, undefined, 'de-DE');
    expect(a.locale).toBe('de-DE');
    expect(b.locale).toBe('en-US');
  });

  it('does not mutate the input columns or the registry', () => {
    const def: CellTypeDef = { extends: 'number', width: 100 };
    const col: ColumnDef = { cellType: 'n', key: 'a', header: 'A' };
    resolveColumns([col], { n: def }, 'vi-VN');
    expect(col).toEqual({ cellType: 'n', key: 'a', header: 'A' });
    expect(def).toEqual({ extends: 'number', width: 100 });
  });
});
