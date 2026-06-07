import { describe, it, expect } from 'vitest';
import {
  formatCell,
  isNumeric,
  isEditable,
  isSortable,
  colWidth,
  dataBarGeometry,
  pickIcon,
  toneColor,
  type ColumnDef,
  type GridRow,
  type IconRule,
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
  it('requires editable and excludes sparkline/custom (date is editable since 0.5)', () => {
    expect(isEditable({ type: 'number', key: 'n', header: 'N', editable: true })).toBe(true);
    expect(isEditable({ type: 'number', key: 'n', header: 'N' })).toBe(false); // not flagged
    expect(isEditable({ type: 'date', key: 'd', header: 'D', editable: true })).toBe(true);
    expect(isEditable({ type: 'custom', key: 'x', header: 'X', editable: true })).toBe(false);
    expect(isEditable({ type: 'sparkline', key: 's', header: 'S', sparkKey: 'k', editable: true })).toBe(false);
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

describe('dataBarGeometry', () => {
  it('left-anchors a non-negative range (min 0): width is the value fraction', () => {
    const r = { min: 0, max: 100 };
    expect(dataBarGeometry(100, r)).toEqual({ left: 0, width: 1, negative: false });
    expect(dataBarGeometry(50, r)).toEqual({ left: 0, width: 0.5, negative: false });
    expect(dataBarGeometry(0, r)).toEqual({ left: 0, width: 0, negative: false });
  });

  it('diverges around the zero baseline when the range spans negatives', () => {
    const r = { min: -100, max: 100 }; // zero sits at 0.5
    expect(dataBarGeometry(100, r)).toEqual({ left: 0.5, width: 0.5, negative: false });
    expect(dataBarGeometry(-100, r)).toEqual({ left: 0, width: 0.5, negative: true });
    expect(dataBarGeometry(0, r)).toEqual({ left: 0.5, width: 0, negative: false });
    expect(dataBarGeometry(-50, r)).toEqual({ left: 0.25, width: 0.25, negative: true });
  });

  it('clamps values outside the range to the edges', () => {
    expect(dataBarGeometry(999, { min: 0, max: 10 })).toEqual({ left: 0, width: 1, negative: false });
    expect(dataBarGeometry(-999, { min: 0, max: 10 })).toEqual({ left: 0, width: 0, negative: true });
  });

  it('returns null for non-numeric values (no bar)', () => {
    expect(dataBarGeometry('abc', { min: 0, max: 10 })).toBeNull();
    expect(dataBarGeometry(null, { min: 0, max: 10 })).toBeNull();
    expect(dataBarGeometry(undefined, { min: 0, max: 10 })).toBeNull();
  });

  it('does not divide by zero on a degenerate (min === max) range', () => {
    expect(dataBarGeometry(5, { min: 5, max: 5 })).toEqual({ left: 0, width: 0, negative: false });
  });
});

describe('pickIcon', () => {
  const sign: IconRule[] = [
    { at: -Infinity, icon: '▼', tone: 'down' },
    { at: 0, icon: '▲', tone: 'up' },
  ];

  it('picks the greatest threshold at ≤ value', () => {
    expect(pickIcon(5, sign)?.icon).toBe('▲');
    expect(pickIcon(0, sign)?.icon).toBe('▲'); // at:0 is inclusive
    expect(pickIcon(-3, sign)?.icon).toBe('▼');
  });

  it('is order-independent', () => {
    const reversed = [...sign].reverse();
    expect(pickIcon(5, reversed)?.icon).toBe('▲');
    expect(pickIcon(-3, reversed)?.icon).toBe('▼');
  });

  it('handles multi-band scales', () => {
    const bands: IconRule[] = [
      { at: 0, icon: 'lo' },
      { at: 50, icon: 'mid' },
      { at: 80, icon: 'hi' },
    ];
    expect(pickIcon(90, bands)?.icon).toBe('hi');
    expect(pickIcon(60, bands)?.icon).toBe('mid');
    expect(pickIcon(10, bands)?.icon).toBe('lo');
    expect(pickIcon(-5, bands)).toBeNull(); // below every threshold
  });

  it('returns null for non-numeric values or no rules', () => {
    expect(pickIcon('x', sign)).toBeNull();
    expect(pickIcon(5, [])).toBeNull();
  });
});

describe('toneColor', () => {
  it('maps semantic tones to theme vars, defaulting to dim', () => {
    expect(toneColor('up')).toBe('var(--bo-up)');
    expect(toneColor('down')).toBe('var(--bo-down)');
    expect(toneColor('amber')).toBe('var(--bo-amber)');
    expect(toneColor('info')).toBe('var(--bo-sel-border)');
    expect(toneColor('neutral')).toBe('var(--bo-text-dim)');
    expect(toneColor(undefined)).toBe('var(--bo-text-dim)');
  });
});
