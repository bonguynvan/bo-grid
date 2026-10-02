import { describe, it, expect } from 'vitest';
import { DEFAULT_LABELS, resolveLabels } from './labels';

describe('resolveLabels', () => {
  it('returns the defaults when nothing is overridden', () => {
    expect(resolveLabels()).toEqual(DEFAULT_LABELS);
    expect(resolveLabels({})).toEqual(DEFAULT_LABELS);
  });

  it('merges overrides over the defaults without mutating them', () => {
    const l = resolveLabels({ autosize: 'Vừa nội dung' });
    expect(l.autosize).toBe('Vừa nội dung');
    expect(l.hideColumn).toBe(DEFAULT_LABELS.hideColumn);
    expect(DEFAULT_LABELS.autosize).toBe('Autosize');
  });

  it('supports function labels so translations can reorder parts', () => {
    const l = resolveLabels({ filterFor: (h) => `Lọc cột ${h}` });
    expect(l.filterFor('Giá')).toBe('Lọc cột Giá');
    expect(DEFAULT_LABELS.filterFor('Price')).toBe('Filter Price');
  });

  it('ignores undefined override values', () => {
    const l = resolveLabels({ noRows: undefined });
    expect(l.noRows).toBe(DEFAULT_LABELS.noRows);
  });

  it('formats the page range through a function', () => {
    expect(DEFAULT_LABELS.pageRange(1, 50, 120)).toBe('1–50 of 120');
  });
});
