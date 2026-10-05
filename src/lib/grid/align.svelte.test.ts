// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { ColumnDef } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

// `align` sets the side for the whole column: header, cells and footer agree,
// so a value always sits under its title.
const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'custom', key: 'last', header: 'Last', align: 'right' },
  { type: 'number', key: 'px', header: 'Px', align: 'left', groupAgg: 'sum' },
  { type: 'number', key: 'qty', header: 'Qty', groupAgg: 'sum' },
];
const rows = [
  { id: 1, sym: 'AAA', last: '10.5', px: 10, qty: 1 },
  { id: 2, sym: 'BBB', last: '20.5', px: 20, qty: 2 },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

const headerOf = (ci: number) => grid!.target.querySelector(`.head [role=columnheader][aria-colindex="${ci}"]`)!;
const cellOf = (ci: number) => grid!.target.querySelector(`.viewport .row [aria-colindex="${ci}"]`)!;
const footOf = (ci: number) => grid!.target.querySelector(`.footer [aria-colindex="${ci}"]`)!;
const side = (el: Element) => (el.classList.contains('right') ? 'right' : el.classList.contains('left') ? 'left' : 'type');

describe('column align', () => {
  it('right-aligns a custom column\'s cells under its right-aligned header', () => {
    grid = mountGrid({ rows, columns });
    expect(headerOf(2).classList.contains('right')).toBe(true);
    expect(side(cellOf(2))).toBe('right');
  });

  it('lets align: left override a number column, header and cells alike', () => {
    grid = mountGrid({ rows, columns, footer: true });
    expect(headerOf(3).classList.contains('right')).toBe(false);
    expect(side(cellOf(3))).toBe('left');
    expect(footOf(3).classList.contains('right')).toBe(false);
  });

  it('keeps the type default when align is not set', () => {
    grid = mountGrid({ rows, columns, footer: true });
    expect(headerOf(1).classList.contains('right')).toBe(false);
    expect(side(cellOf(1))).toBe('type');
    expect(headerOf(4).classList.contains('right')).toBe(true);
    expect(cellOf(4).classList.contains('num')).toBe(true);
    expect(footOf(4).classList.contains('right')).toBe(true);
  });
});
