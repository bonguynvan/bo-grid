import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { toCSV, rowsToMatrix } from './export';

const columns: ColumnDef[] = [
  { type: 'text', key: 'name', header: 'Name' },
  { type: 'price', key: 'price', header: 'Price' },
  { type: 'sparkline', key: 'candles', sparkKey: 'candles', header: 'Trend' },
];

const rows = [
  { id: 0, name: 'Acme, Inc', price: 12.5, candles: [] },
  { id: 1, name: 'Quote "Co"', price: 7, candles: [] },
] as unknown as GridRow[];

describe('rowsToMatrix', () => {
  it('excludes sparkline columns and includes a header row', () => {
    const m = rowsToMatrix(rows, columns);
    expect(m[0]).toEqual(['Name', 'Price']);
    expect(m).toHaveLength(3);
  });

  it('keeps numeric columns as raw numbers', () => {
    expect(rowsToMatrix(rows, columns)[1][1]).toBe(12.5);
  });

  it('omits the header when header:false', () => {
    expect(rowsToMatrix(rows, columns, { header: false })).toHaveLength(2);
  });
});

describe('toCSV', () => {
  it('quotes fields with commas and doubles embedded quotes', () => {
    const lines = toCSV(rows, columns).split('\r\n');
    expect(lines[0]).toBe('Name,Price');
    expect(lines[1]).toBe('"Acme, Inc",12.5');
    expect(lines[2]).toBe('"Quote ""Co""",7');
  });

  it('runs values through formatters in formatted mode', () => {
    const csv = toCSV(rows, columns, { formatted: true, header: false });
    expect(csv.startsWith('"Acme, Inc",12.50')).toBe(true);
  });
});
