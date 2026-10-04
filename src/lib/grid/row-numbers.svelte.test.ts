// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'text', key: 'sector', header: 'Sector' },
  { type: 'number', key: 'px', header: 'Px' },
];
const rows: GridRow[] = [
  { id: 1, sym: 'CCC', sector: 'Bank', px: 30 },
  { id: 2, sym: 'AAA', sector: 'Tech', px: 10 },
  { id: 3, sym: 'BBB', sector: 'Bank', px: 20 },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

const bodyRows = () => [...grid!.target.querySelectorAll('.viewport .spacer > .row, .viewport .spacer > .grouprow')];
const numbers = () => bodyRows().map((r) => r.querySelector('.numcell')?.textContent?.trim() ?? null);

describe('rowNumbers', () => {
  it('adds a leading row-header column numbered in view order', () => {
    grid = mountGrid({ rows, columns, rowNumbers: true, sort: [{ key: 'sym', dir: 'asc' }] });
    expect(numbers()).toEqual(['1', '2', '3']);
    const first = bodyRows()[0];
    // Numbers follow position, not the row: AAA sorts first and is row 1.
    expect(first.querySelector('[aria-colindex="2"]')?.textContent).toContain('AAA');
    const num = first.querySelector('.numcell');
    expect(num?.getAttribute('role')).toBe('rowheader');
    expect(num?.getAttribute('aria-colindex')).toBe('1');
  });

  it('gives the column a named header and shifts the other columns', () => {
    grid = mountGrid({ rows, columns, rowNumbers: true });
    const head = grid.target.querySelector('.head .numcell');
    expect(head?.getAttribute('role')).toBe('columnheader');
    expect(head?.getAttribute('aria-colindex')).toBe('1');
    expect(head?.textContent?.trim()).toBe('Row');
    expect(grid.target.querySelector('.head [role=columnheader][aria-colindex="2"]')?.textContent).toContain('Sym');
    expect(grid.target.querySelector('[role=grid]')?.getAttribute('aria-colcount')).toBe('4');
  });

  it('numbers data rows only when grouped', () => {
    grid = mountGrid({ rows, columns, rowNumbers: true, groupBy: ['sector'] });
    // Bank group, its two rows, Tech group, its row.
    expect(numbers()).toEqual(['', '1', '2', '', '3']);
  });

  it('is off by default', () => {
    grid = mountGrid({ rows, columns });
    expect(grid.target.querySelector('.numcell')).toBeNull();
  });
});
