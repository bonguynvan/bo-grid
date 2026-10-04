// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'number', key: 'px', header: 'Px' },
];
const makeRows = (): GridRow[] => [
  { id: 1, sym: 'AAA', px: 10 },
  { id: 2, sym: 'BBB', px: 20 },
  { id: 3, sym: 'CCC', px: 30 },
];

let grid: MountedGrid | null = null;
beforeEach(() => localStorage.clear());
afterEach(() => {
  grid?.destroy();
  grid = null;
});

const bodyRow = (sym: string) =>
  [...grid!.target.querySelectorAll('.viewport .spacer > .row')].find((r) => r.textContent?.includes(sym)) as HTMLElement;
const pinnedSyms = () => [...grid!.target.querySelectorAll('.pinned-top .row')].map((r) => r.querySelector('.c')?.textContent?.trim());
function rightClick(el: Element) {
  el.querySelector('.c')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
  flushSync();
}
const menuItems = () => [...document.querySelectorAll('[role=menuitem]')].map((m) => m.textContent?.trim());
function choose(label: string) {
  const item = [...document.querySelectorAll('[role=menuitem]')].find((m) => m.textContent?.trim() === label) as HTMLElement;
  item.click();
  flushSync();
}

describe('rowPinning', () => {
  it('pins a row to the top from its context menu, keeping it in the body', () => {
    const changes: unknown[] = [];
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true, onRowPinChange: (ids: unknown) => changes.push(ids) });
    rightClick(bodyRow('BBB'));
    expect(menuItems()).toContain('Pin to top');
    choose('Pin to top');
    expect(pinnedSyms()).toEqual(['BBB']);
    expect(bodyRow('BBB')).toBeTruthy();
    expect(changes).toEqual([[2]]);
  });

  it('offers Unpin on a pinned row, in the body and in the pinned area', () => {
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true });
    rightClick(bodyRow('AAA'));
    choose('Pin to top');
    rightClick(bodyRow('AAA'));
    expect(menuItems()).toContain('Unpin');
    rightClick(grid.target.querySelector('.pinned-top .row')!);
    choose('Unpin');
    expect(pinnedSyms()).toEqual([]);
  });

  it('adds no menu items when off', () => {
    grid = mountGrid({ rows: makeRows(), columns });
    rightClick(bodyRow('AAA'));
    expect(menuItems()).toEqual([]);
  });

  it('pins through the API and round-trips through getState / applyState', () => {
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true });
    expect(grid.api().pinRow(3)).toBe(true);
    expect(grid.api().pinRow(99)).toBe(false);
    flushSync();
    expect(grid.api().getPinnedRowIds()).toEqual([3]);
    const state = grid.api().getState();
    expect(state.pinnedRows).toEqual([3]);
    grid.api().pinRow(3, false);
    flushSync();
    expect(pinnedSyms()).toEqual([]);
    grid.api().applyState(state);
    flushSync();
    expect(pinnedSyms()).toEqual(['CCC']);
  });

  it('remembers pinned rows across mounts with persistKey', () => {
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true, persistKey: 'watch' });
    grid.api().pinRow(1);
    flushSync();
    grid.destroy();
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true, persistKey: 'watch' });
    expect(pinnedSyms()).toEqual(['AAA']);
  });

  it('repaints a pinned row patched in place (api.patchRows)', () => {
    grid = mountGrid({ rows: makeRows(), columns, rowPinning: true });
    grid.api().pinRow(2);
    flushSync();
    grid.api().patchRows([[2, { px: 25 }]]);
    flushSync();
    const pinned = grid.target.querySelector('.pinned-top .row')!;
    expect(pinned.textContent).toContain('25');
  });
});
