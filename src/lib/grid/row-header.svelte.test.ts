// @vitest-environment jsdom
// `rowHeader` on a column: its cells name their row for a screen reader.
import { afterEach, describe, expect, it } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym', rowHeader: true },
  { type: 'number', key: 'px', header: 'Px' },
];
const rows: GridRow[] = [
  { id: 1, sym: 'AAA', px: 10 },
  { id: 2, sym: 'BBB', px: 20 },
];

let m: MountedGrid | null = null;
afterEach(() => {
  m?.destroy();
  m = null;
});
const gridEl = () => m!.target.querySelector('[role=grid]') as HTMLElement;
const press = (key: string) => {
  gridEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  flushSync();
};

describe('rowHeader column', () => {
  it("renders the column's cells as row headers, keeping their column index", () => {
    m = mountGrid({ rows, columns });
    const dataRows = [...gridEl().querySelectorAll('.spacer > .row')];
    expect(dataRows).toHaveLength(2);
    for (const row of dataRows) {
      const head = row.querySelector('[role=rowheader]')!;
      expect(head.textContent).toMatch(/AAA|BBB/);
      expect(head.getAttribute('aria-colindex')).toBe('1');
      expect(row.querySelector('[role=gridcell]')?.getAttribute('aria-colindex')).toBe('2');
    }
  });

  it('is a gridcell when the option is off', () => {
    m = mountGrid({ rows, columns: columns.map(({ rowHeader: _, ...c }) => c as ColumnDef) });
    expect(gridEl().querySelector('.spacer [role=rowheader]')).toBeNull();
  });

  it('takes the keyboard focus, the ring and the selection like any cell', () => {
    m = mountGrid({ rows, columns });
    gridEl().focus();
    press('ArrowDown');
    press('ArrowRight');
    press('ArrowLeft');
    const active = gridEl().getAttribute('aria-activedescendant')!;
    const cell = document.getElementById(active)!;
    expect(cell.getAttribute('role')).toBe('rowheader');
    expect(cell.classList.contains('focus')).toBe(true);
    expect(cell.getAttribute('aria-selected')).toBe('true');
  });

  it('sits beside the row numbers, which stay row headers', () => {
    m = mountGrid({ rows, columns, rowNumbers: true });
    const row = gridEl().querySelector('.spacer > .row')!;
    expect([...row.querySelectorAll('[role=rowheader]')].map((c) => c.getAttribute('aria-colindex'))).toEqual(['1', '2']);
  });
});
