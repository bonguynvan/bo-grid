import { describe, it, expect } from 'vitest';
import { dataOrdinals, rowNumberWidth } from './rownumbers';

describe('rowNumberWidth', () => {
  it('fits the widest number, with a floor for short lists', () => {
    expect(rowNumberWidth(0)).toBe(36);
    expect(rowNumberWidth(9)).toBe(36);
    expect(rowNumberWidth(999)).toBe(40);
    expect(rowNumberWidth(1_000)).toBe(48);
    expect(rowNumberWidth(1_000_000)).toBe(72);
  });
});

describe('dataOrdinals', () => {
  it('numbers data rows by position, skipping group and loading rows', () => {
    const flat = [{ kind: 'group' }, { kind: 'data' }, { kind: 'data' }, { kind: 'group' }, { kind: 'data' }, { kind: 'treeloading' }];
    expect([...dataOrdinals(flat)]).toEqual([0, 1, 2, 0, 3, 0]);
  });

  it('is 1..n for a flat list', () => {
    expect([...dataOrdinals([{ kind: 'data' }, { kind: 'data' }, { kind: 'data' }])]).toEqual([1, 2, 3]);
  });
});
