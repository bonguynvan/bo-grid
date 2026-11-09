// @vitest-environment jsdom
// What a screen reader hears about rows and headers: the selectedRowId row's
// state, and a column header hidden from sight (headerHidden).
import { afterEach, describe, expect, it } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'number', key: 'px', header: 'Px' },
];
const rows: GridRow[] = [
  { id: 'a', sym: 'AAA', px: 10 },
  { id: 'b', sym: 'BBB', px: 20 },
];

let m: MountedGrid | null = null;
afterEach(() => {
  m?.destroy();
  m = null;
});
const gridEl = () => m!.target.querySelector('[role=grid]') as HTMLElement;
const dataRows = () => [...gridEl().querySelectorAll('.spacer > .row')] as HTMLElement[];
const attr = (name: string) => dataRows().map((r) => r.getAttribute(name));

describe('selectedRowId and screen readers', () => {
  it('marks the selected row aria-selected="true" and the others "false"', () => {
    m = mountGrid({ rows, columns, selectedRowId: 'a' });
    expect(attr('aria-selected')).toEqual(['true', 'false']);
    expect(attr('aria-current')).toEqual([null, null]);
  });

  it('sets no row state while nothing is selected', () => {
    m = mountGrid({ rows, columns, selectedRowId: null });
    expect(attr('aria-selected')).toEqual([null, null]);
  });

  it('leaves aria-selected to the checkboxes with rowSelection, and marks the row aria-current', () => {
    m = mountGrid({ rows, columns, selectedRowId: 'b', rowSelection: true });
    expect(attr('aria-selected')).toEqual(['false', 'false']);
    expect(attr('aria-current')).toEqual([null, 'true']);
  });

  it('gives cells no aria-selected unless cellSelection is on', () => {
    m = mountGrid({ rows, columns, selectedRowId: 'a', cellSelection: false });
    expect(gridEl().querySelectorAll('.spacer [role=gridcell][aria-selected]')).toHaveLength(0);
    m.destroy();
    m = mountGrid({ rows, columns, cellSelection: true });
    expect(gridEl().querySelectorAll('.spacer [role=gridcell][aria-selected]').length).toBeGreaterThan(0);
  });
});

describe('headerHidden', () => {
  const withEdit: ColumnDef[] = [...columns, { type: 'text', key: 'edit', header: 'Edit', headerHidden: true }];
  const header = (key: string) =>
    [...gridEl().querySelectorAll('[role=columnheader]')].find((h) => h.textContent?.includes(key)) as HTMLElement;

  it('keeps the header text and name, hidden from sight', () => {
    m = mountGrid({ rows, columns: withEdit });
    const h = header('Edit');
    expect(h.getAttribute('aria-label')).toBe('Edit');
    expect(h.querySelector('.label')?.classList.contains('bo-sr-only')).toBe(true);
  });

  it('leaves other headers visible', () => {
    m = mountGrid({ rows, columns: withEdit });
    expect(header('Sym').querySelector('.label')?.classList.contains('bo-sr-only')).toBe(false);
  });
});
