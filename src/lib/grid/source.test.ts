import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { createArraySource } from './source';
import { RowSourceController } from './source.svelte';

const _cols: ColumnDef[] = [{ type: 'number', key: 'n', header: 'N' }];

function makeRows(n: number): GridRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: i,
    flashSeq: 0,
    flashDir: 'up',
    n: n - i, // reverse, so sorting is observable
  })) as unknown as GridRow[];
}

describe('createArraySource', () => {
  it('returns the requested window and the total', () => {
    const src = createArraySource(makeRows(100));
    const res = src.getRows({ range: { start: 10, end: 15 }, sort: null, filter: '' });
    expect('then' in res).toBe(false); // sync when latency is 0
    if (!('then' in res)) {
      expect(res.total).toBe(100);
      expect(res.rows).toHaveLength(5);
      expect(res.rows[0].id).toBe(10);
    }
  });

  it('applies sort before slicing', () => {
    const src = createArraySource(makeRows(10));
    const res = src.getRows({ range: { start: 0, end: 3 }, sort: { key: 'n', dir: 'asc' }, filter: '' });
    if (!('then' in res)) {
      expect(res.rows.map((r) => r.n)).toEqual([1, 2, 3]);
    }
  });

  it('filters on the configured keys and adjusts total', () => {
    const rows = [
      { id: 0, flashSeq: 0, flashDir: 'up', name: 'apple' },
      { id: 1, flashSeq: 0, flashDir: 'up', name: 'banana' },
      { id: 2, flashSeq: 0, flashDir: 'up', name: 'apricot' },
    ] as unknown as GridRow[];
    const src = createArraySource(rows, { filterKeys: ['name'] });
    const res = src.getRows({ range: { start: 0, end: 10 }, sort: null, filter: 'ap' });
    if (!('then' in res)) {
      expect(res.total).toBe(2);
      expect(res.rows.map((r) => r.name)).toEqual(['apple', 'apricot']);
    }
  });

  it('applies structured columnFilters server-side and adjusts total', () => {
    const rows = [
      { id: 0, flashSeq: 0, flashDir: 'up', px: 5 },
      { id: 1, flashSeq: 0, flashDir: 'up', px: 50 },
      { id: 2, flashSeq: 0, flashDir: 'up', px: 200 },
    ] as unknown as GridRow[];
    const src = createArraySource(rows);
    const res = src.getRows({
      range: { start: 0, end: 10 },
      sort: null,
      filter: '',
      columnFilters: { px: { kind: 'number', op: 'gt', a: 10 } },
    });
    if (!('then' in res)) {
      expect(res.total).toBe(2);
      expect(res.rows.map((r) => r.px)).toEqual([50, 200]);
    }
  });
});

describe('RowSourceController', () => {
  it('fetches a window, sets total, and caches rows by index', async () => {
    const ctrl = new RowSourceController(createArraySource(makeRows(50)));
    await ctrl.fetch({ start: 5, end: 10 }, [], '');
    expect(ctrl.total).toBe(50);
    expect(ctrl.rowAt(5)?.id).toBe(5);
    expect(ctrl.rowAt(9)?.id).toBe(9);
    expect(ctrl.rowAt(20)).toBeNull(); // outside the fetched window
  });

  it('drops the cache when sort/filter changes', async () => {
    const ctrl = new RowSourceController(createArraySource(makeRows(50)));
    await ctrl.fetch({ start: 0, end: 5 }, [], '');
    expect(ctrl.rowAt(0)?.n).toBe(50);
    await ctrl.fetch({ start: 0, end: 5 }, [{ key: 'n', dir: 'asc' }], '');
    expect(ctrl.rowAt(0)?.n).toBe(1); // re-fetched under the new sort
  });

  it('drops the cache and re-filters when columnFilters change', async () => {
    const ctrl = new RowSourceController(createArraySource(makeRows(50)));
    await ctrl.fetch({ start: 0, end: 5 }, [], '');
    expect(ctrl.total).toBe(50);
    await ctrl.fetch({ start: 0, end: 5 }, [], '', { n: { kind: 'number', op: 'lt', a: 10 } });
    expect(ctrl.total).toBe(9); // n = 1..9 pass (makeRows: n = 50-i)
  });
});
