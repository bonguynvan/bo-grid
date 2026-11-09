// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'number', key: 'px', header: 'Px' },
];
const rows: GridRow[] = [
  { id: 1, sym: 'AAA', px: 10 },
  { id: 2, sym: 'BBB', px: 20 },
  { id: 3, sym: 'CCC', px: 30 },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});
const gridEl = () => grid!.target.querySelector('[role=grid]') as HTMLElement;
const press = (key: string, opts: KeyboardEventInit = {}) => {
  gridEl().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts }));
  flushSync();
};
const focusedCells = () => [...gridEl().querySelectorAll('[role=gridcell].focus')].map((c) => c.id);
const selectedCells = () => gridEl().querySelectorAll('[role=gridcell].sel').length;

describe('focus ring without cell selection', () => {
  it('draws the ring where the keyboard moves the focus (WCAG 2.4.7)', () => {
    grid = mountGrid({ rows, columns, cellSelection: false });
    gridEl().focus();
    flushSync();
    press('ArrowDown');
    press('ArrowDown');
    const active = gridEl().getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    expect(focusedCells()).toEqual([active]);
  });

  it('selects no range: Shift+arrows move the focus, Ctrl+A does nothing', () => {
    grid = mountGrid({ rows, columns, cellSelection: false });
    gridEl().focus();
    press('ArrowDown');
    press('ArrowDown', { shiftKey: true });
    press('ArrowRight', { shiftKey: true });
    expect(focusedCells()).toHaveLength(1);
    expect(selectedCells()).toBe(0);
    press('a', { ctrlKey: true });
    expect(selectedCells()).toBe(0);
    expect(gridEl().hasAttribute('aria-multiselectable')).toBe(false);
  });

  it('draws nothing for a click, then carries on from the clicked cell', () => {
    grid = mountGrid({ rows, columns, cellSelection: false });
    const cell = gridEl().querySelectorAll('[role=row] [role=gridcell]')[4] as HTMLElement; // CCC · px
    const down = new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0 });
    cell.dispatchEvent(down);
    flushSync();
    // The grid keeps the focus: the cell (tabindex -1) must not take it, or
    // the keys would leave the ring behind on it.
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(gridEl());
    expect(focusedCells()).toEqual([]);
    press('ArrowLeft');
    expect(focusedCells()).toHaveLength(1);
    expect(gridEl().querySelector('[role=gridcell].focus')?.textContent).toContain('CCC');
  });

  it('hides the ring when the grid loses focus', () => {
    grid = mountGrid({ rows, columns, cellSelection: false });
    gridEl().focus();
    press('ArrowDown');
    expect(focusedCells()).toHaveLength(1);
    gridEl().blur();
    flushSync();
    expect(focusedCells()).toEqual([]);
  });

  it('keeps the ring and the range with cell selection on', () => {
    grid = mountGrid({ rows, columns });
    gridEl().focus();
    press('ArrowDown');
    press('ArrowDown', { shiftKey: true });
    expect(focusedCells()).toHaveLength(1);
    expect(selectedCells()).toBe(2);
    expect(gridEl().getAttribute('aria-multiselectable')).toBe('true');
  });
});
