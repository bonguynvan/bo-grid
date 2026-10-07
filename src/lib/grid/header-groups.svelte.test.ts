// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { ColumnDef } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

// Ungrouped columns before a group: the spanning row gives each one a blank
// span of its width, so each group label sits over its own columns.
const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym', width: 80 },
  { type: 'price', key: 'ref', header: 'Ref', width: 70 },
  { type: 'price', key: 'b1', header: 'P1', width: 60, group: 'Bids' },
  { type: 'volume', key: 'b1v', header: 'V1', width: 60, group: 'Bids' },
  { type: 'price', key: 'last', header: 'Last', width: 70, group: 'Matched' },
];
const rows = [{ id: 1, sym: 'AAA', ref: 10, b1: 9.9, b1v: 100, last: 10 }];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

const spans = () => [...grid!.target.querySelectorAll<HTMLElement>('.head-groups .hg')];

describe('header groups', () => {
  it('gives each leading ungrouped column a blank span of its width', () => {
    grid = mountGrid({ rows, columns });
    expect(spans().map((s) => [s.textContent, s.style.width])).toEqual([
      ['', '80px'],
      ['', '70px'],
      ['Bids', '120px'],
      ['Matched', '70px'],
    ]);
  });

  it('keeps the blank spans off the empty-state class', () => {
    // The "No rows" overlay is absolutely positioned. A spacer carrying its
    // class leaves the row and every group label slides left.
    grid = mountGrid({ rows, columns });
    for (const blank of spans().slice(0, 2)) {
      expect(blank.classList.contains('blank')).toBe(true);
      expect(blank.classList.contains('empty')).toBe(false);
    }
    expect(spans()[2].classList.contains('blank')).toBe(false);
  });

  it('still shows the empty-state message when there are no rows', () => {
    grid = mountGrid({ rows: [], columns });
    expect(grid.target.querySelector('.empty')?.textContent?.trim()).toBeTruthy();
    expect(spans()[0].classList.contains('empty')).toBe(false);
  });
});
