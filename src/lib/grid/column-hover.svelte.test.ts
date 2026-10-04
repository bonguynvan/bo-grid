// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'number', key: 'px', header: 'Px' },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

function hover(el: Element, pointerType = 'mouse') {
  const Ctor = (globalThis.PointerEvent ?? MouseEvent) as typeof PointerEvent;
  const e = new Ctor('pointerover', { bubbles: true });
  Object.defineProperty(e, 'pointerType', { value: pointerType });
  el.dispatchEvent(e);
  flushSync();
}
const overlay = () => grid!.target.querySelector('.viewport .colhover');
const headerOf = (colindex: number) => grid!.target.querySelector(`.head [role=columnheader][aria-colindex="${colindex}"]`);
const cellOf = (colindex: number) => grid!.target.querySelector(`.viewport .row [aria-colindex="${colindex}"]`)!;

describe('columnHover', () => {
  it('highlights the hovered column with one overlay and marks its header', () => {
    grid = mountGrid({ columns, columnHover: true });
    expect(overlay()).toBeNull();
    hover(cellOf(2));
    expect(grid.target.querySelectorAll('.viewport .colhover')).toHaveLength(1);
    expect(headerOf(2)?.classList.contains('colhover')).toBe(true);
    expect(headerOf(1)?.classList.contains('colhover')).toBe(false);
    hover(cellOf(1));
    expect(headerOf(1)?.classList.contains('colhover')).toBe(true);
    expect(headerOf(2)?.classList.contains('colhover')).toBe(false);
  });

  it('clears when the pointer leaves the grid body', () => {
    grid = mountGrid({ columns, columnHover: true });
    hover(cellOf(2));
    grid.target.querySelector('.viewport')!.dispatchEvent(new Event('pointerleave'));
    flushSync();
    expect(overlay()).toBeNull();
    expect(headerOf(2)?.classList.contains('colhover')).toBe(false);
  });

  it('ignores touch, which has no hover', () => {
    grid = mountGrid({ columns, columnHover: true });
    hover(cellOf(2), 'touch');
    expect(overlay()).toBeNull();
  });

  it('is off by default', () => {
    grid = mountGrid({ columns });
    hover(cellOf(2));
    expect(overlay()).toBeNull();
    expect(headerOf(2)?.classList.contains('colhover')).toBe(false);
  });
});
