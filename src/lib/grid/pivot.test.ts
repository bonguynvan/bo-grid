import { describe, it, expect } from 'vitest';
import type { GridRow } from './column';
import { pivot } from './pivot';

const rows = [
  { id: 0, sector: 'Tech', exchange: 'NYSE', volume: 10 },
  { id: 1, sector: 'Tech', exchange: 'NASDAQ', volume: 20 },
  { id: 2, sector: 'Tech', exchange: 'NYSE', volume: 5 },
  { id: 3, sector: 'Energy', exchange: 'NASDAQ', volume: 100 },
] as unknown as GridRow[];

describe('pivot', () => {
  it('spreads columnField values into columns with a total', () => {
    const { columns } = pivot(rows, {
      rowFields: ['sector'],
      columnField: 'exchange',
      measure: 'volume',
      agg: 'sum',
    });
    expect(columns.map((c) => c.header)).toEqual(['sector', 'NASDAQ', 'NYSE', 'Total']);
  });

  it('aggregates the measure per (row, column) cell', () => {
    const { rows: out } = pivot(rows, {
      rowFields: ['sector'],
      columnField: 'exchange',
      measure: 'volume',
      agg: 'sum',
    });
    // Energy sorts before Tech
    const energy = out[0] as Record<string, unknown>;
    const tech = out[1] as Record<string, unknown>;
    expect(energy.sector).toBe('Energy');
    expect(energy['__pv_NASDAQ']).toBe(100);
    expect(energy['__pv_NYSE']).toBe(0);
    expect(energy['__pv_total']).toBe(100);
    expect(tech['__pv_NYSE']).toBe(15); // 10 + 5
    expect(tech['__pv_NASDAQ']).toBe(20);
    expect(tech['__pv_total']).toBe(35);
  });

  it('supports a single measure column when no columnField', () => {
    const { columns, rows: out } = pivot(rows, {
      rowFields: ['sector'],
      measure: 'volume',
      agg: 'avg',
    });
    expect(columns.map((c) => c.header)).toEqual(['sector', 'Avg volume', 'Total']);
    expect((out[1] as Record<string, unknown>)['__pv_value']).toBeCloseTo((10 + 20 + 5) / 3);
  });
});
