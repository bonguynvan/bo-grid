// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'text', key: 'sector', header: 'Sector' },
  { type: 'number', key: 'px', header: 'Px', groupAgg: 'sum' },
];
const rows: GridRow[] = [
  { id: 1, sym: 'AAA', sector: 'Bank', px: 10 },
  { id: 2, sym: 'BBB', sector: 'Tech', px: 20 },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});
const gridEl = () => grid!.target.querySelector('[role=grid], [role=treegrid]') as HTMLElement;

/** Every control inside a row sits in a cell — what axe's aria-required-children asks. */
function controlsOutsideCells(): string[] {
  const bad: string[] = [];
  for (const row of gridEl().querySelectorAll('[role=row]')) {
    for (const el of row.querySelectorAll('button, input, select, textarea')) {
      const cell = el.closest('[role=gridcell], [role=columnheader], [role=rowheader]');
      if (!cell || !row.contains(cell)) bad.push(`${el.tagName.toLowerCase()}.${el.className}`);
    }
  }
  return bad;
}

describe('grid ARIA structure', () => {
  it('keeps the toolbar outside the grid', () => {
    grid = mountGrid({ rows, columns, quickFilter: true, columnsPanel: true });
    const search = grid.target.querySelector('.bo-quickfilter');
    expect(search).not.toBeNull();
    expect(gridEl().contains(search)).toBe(false);
    expect(gridEl().getAttribute('tabindex')).toBe('0');
  });

  it('puts every control in a row inside a cell: lead columns, filter row, footer, group rows', () => {
    grid = mountGrid({ rows, columns, rowSelection: true, rowNumbers: true, filterRow: true, footer: true, detail: (() => {}) as never });
    expect(controlsOutsideCells()).toEqual([]);
    const row = gridEl().querySelector('.viewport .spacer > .row')!;
    expect(row.querySelector('.expandcell')?.getAttribute('aria-colindex')).toBe('2');
    expect(row.querySelector('.selcell')?.getAttribute('role')).toBe('gridcell');
    expect(row.querySelector('.selcell')?.getAttribute('aria-colindex')).toBe('3');
    const footer = gridEl().querySelector('.footer');
    if (footer) expect(footer.querySelector('[role=gridcell]')).not.toBeNull();
  });

  it('gives group rows real cells, indexed after the leading columns', () => {
    grid = mountGrid({ rows, columns, rowSelection: true, groupBy: ['sector'] });
    expect(controlsOutsideCells()).toEqual([]);
    const group = gridEl().querySelector('.group[role=row]')!;
    const cells = [...group.querySelectorAll(':scope > [role=gridcell]')];
    expect(cells.map((c) => c.getAttribute('aria-colindex'))).toEqual(['2', '3', '4']);
  });

  it('is a treegrid when rows nest', () => {
    grid = mountGrid({ rows, columns, getChildren: () => [] });
    expect(gridEl().getAttribute('role')).toBe('treegrid');
    grid.destroy();
    grid = mountGrid({ rows, columns });
    expect(gridEl().getAttribute('role')).toBe('grid');
  });

  it('lets Space through in the search box instead of ticking the focused row', () => {
    grid = mountGrid({ rows, columns, quickFilter: true, rowSelection: true });
    const cell = gridEl().querySelector('.viewport .row .c') as HTMLElement;
    cell.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    flushSync();
    const search = grid.target.querySelector('.bo-quickfilter') as HTMLInputElement;
    const e = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    search.dispatchEvent(e);
    flushSync();
    expect(e.defaultPrevented).toBe(false);
    expect([...gridEl().querySelectorAll('.viewport .rowcheck')].some((c) => (c as HTMLInputElement).checked)).toBe(false);
  });
});
