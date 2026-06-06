import { describe, it, expect } from 'vitest';
import {
  formatCell,
  isNumeric,
  isEditable,
  isSortable,
  colWidth,
  type ColumnDef,
  type GridRow,
} from './column';

const row = (over: Record<string, unknown> = {}): GridRow =>
  ({ id: 0, flashSeq: 0, flashDir: 'up', ...over }) as GridRow;

describe('formatCell', () => {
  it('formats numeric types to deterministic strings', () => {
    expect(formatCell({ type: 'number', key: 'n', header: 'N' }, 3.14159)).toBe('3.14');
    expect(formatCell({ type: 'number', key: 'n', header: 'N', decimals: 0 }, 3.7)).toBe('4');
    expect(formatCell({ type: 'heatmap', key: 'h', header: 'H', min: 0, max: 1, decimals: 1 }, 0.25)).toBe('0.3');
  });

  it('passes text values through as strings', () => {
    expect(formatCell({ type: 'text', key: 't', header: 'T' }, 'hi')).toBe('hi');
    expect(formatCell({ type: 'text', key: 't', header: 'T' }, null)).toBe('');
  });

  it('returns non-empty strings for price/percent/volume', () => {
    expect(formatCell({ type: 'price', key: 'p', header: 'P' }, 12.5).length).toBeGreaterThan(0);
    expect(formatCell({ type: 'percent', key: 'c', header: 'C' }, 1.2).length).toBeGreaterThan(0);
    expect(formatCell({ type: 'volume', key: 'v', header: 'V' }, 1_500_000).length).toBeGreaterThan(0);
  });

  it('honours a custom format() with the row, overriding the type formatter', () => {
    const col: ColumnDef = { type: 'number', key: 'salary', header: 'Salary', format: (v) => `$${v}` };
    expect(formatCell(col, 100, row({ salary: 100 }))).toBe('$100');
  });
});

describe('isNumeric', () => {
  it('is false for text/sparkline/custom, true for value types', () => {
    expect(isNumeric({ type: 'text', key: 'a', header: 'A' })).toBe(false);
    expect(isNumeric({ type: 'sparkline', key: 'c', header: 'C', sparkKey: 'c' })).toBe(false);
    expect(isNumeric({ type: 'custom', key: 'x', header: 'X' })).toBe(false);
    expect(isNumeric({ type: 'price', key: 'p', header: 'P' })).toBe(true);
    expect(isNumeric({ type: 'number', key: 'n', header: 'N' })).toBe(true);
  });
});

describe('isEditable', () => {
  it('requires editable and excludes sparkline/date/custom', () => {
    expect(isEditable({ type: 'number', key: 'n', header: 'N', editable: true })).toBe(true);
    expect(isEditable({ type: 'number', key: 'n', header: 'N' })).toBe(false); // not flagged
    expect(isEditable({ type: 'date', key: 'd', header: 'D', editable: true })).toBe(false);
    expect(isEditable({ type: 'custom', key: 'x', header: 'X', editable: true })).toBe(false);
  });
});

describe('isSortable', () => {
  it('excludes sparkline and respects sortable:false', () => {
    expect(isSortable({ type: 'price', key: 'p', header: 'P' })).toBe(true);
    expect(isSortable({ type: 'sparkline', key: 'c', header: 'C', sparkKey: 'c' })).toBe(false);
    expect(isSortable({ type: 'price', key: 'p', header: 'P', sortable: false })).toBe(false);
  });
});

describe('colWidth', () => {
  it('uses explicit width, else type-appropriate defaults', () => {
    expect(colWidth({ type: 'number', key: 'n', header: 'N', width: 120 })).toBe(120);
    expect(colWidth({ type: 'number', key: 'n', header: 'N' })).toBe(96); // fixed default
    expect(colWidth({ type: 'text', key: 't', header: 'T', flex: 1 })).toBe(160); // flex default
  });
});
