// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { flushSync } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

const columns: ColumnDef[] = [
  { type: 'text', key: 'sym', header: 'Sym' },
  { type: 'text', key: 'name', header: 'Name' },
  { type: 'number', key: 'px', header: 'Px', format: (v) => `$${v}` },
];
const rows: GridRow[] = [
  { id: 1, sym: 'VNM', name: 'Vinamilk', px: 68 },
  { id: 2, sym: 'FPT', name: 'FPT Corp', px: 130 },
  { id: 3, sym: 'VIC', name: 'Vingroup', px: 44 },
  { id: 4, sym: 'HPG', name: 'Hoa Phat', px: 27 },
];

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

const gridEl = () => grid!.target.querySelector('[role=grid]') as HTMLElement;
const findInput = () => grid!.target.querySelector('.bo-find input') as HTMLInputElement | null;
const count = () => grid!.target.querySelector('.bo-find-count')?.textContent?.trim();
/** The focused cell's text, via aria-activedescendant. */
const active = () => document.getElementById(gridEl().getAttribute('aria-activedescendant') ?? '')?.textContent?.trim();

function key(el: Element, k: string, opts: KeyboardEventInit = {}) {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...opts });
  el.dispatchEvent(e);
  flushSync();
  return e;
}
/** Ctrl+F in the grid; the bar loads lazily, so wait for its input. */
async function openWithKeys() {
  const e = key(gridEl(), 'f', { ctrlKey: true });
  await vi.waitFor(() => {
    flushSync();
    expect(findInput()).not.toBeNull();
  });
  return e;
}
function type(text: string) {
  const input = findInput()!;
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  flushSync();
}

describe('findBar', () => {
  it('opens on Ctrl+F in the grid and focuses its input', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    const e = await openWithKeys();
    expect(e.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(findInput());
    expect(gridEl().contains(findInput())).toBe(false);
  });

  it('matches the displayed text, case-insensitively, and focuses the first match', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    await openWithKeys();
    type('vin');
    expect(count()).toBe('1 of 2');
    expect(active()).toBe('Vinamilk');
    type('$44');
    expect(active()).toBe('$44');
  });

  it('steps through matches with Enter and Shift+Enter, wrapping around', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    await openWithKeys();
    type('v');
    expect(count()).toBe('1 of 4'); // VNM, Vinamilk, VIC, Vingroup
    key(findInput()!, 'Enter');
    expect(active()).toBe('Vinamilk');
    expect(count()).toBe('2 of 4');
    key(findInput()!, 'Enter', { shiftKey: true });
    key(findInput()!, 'Enter', { shiftKey: true });
    expect(count()).toBe('4 of 4');
    expect(active()).toBe('Vingroup');
  });

  it('says so when nothing matches', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    await openWithKeys();
    type('zzz');
    expect(count()).toBe('No matches');
  });

  it('closes on Escape and gives focus back to the grid', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    await openWithKeys();
    key(findInput()!, 'Escape');
    expect(findInput()).toBeNull();
    expect(document.activeElement).toBe(gridEl());
  });

  it('opens from the API with a query', async () => {
    grid = mountGrid({ rows, columns, findBar: true });
    grid.api().openFind('hoa');
    await vi.waitFor(() => {
      flushSync();
      expect(findInput()?.value).toBe('hoa');
    });
    expect(active()).toBe('Hoa Phat');
  });

  it('leaves Ctrl+F to the browser when off', () => {
    grid = mountGrid({ rows, columns });
    const e = key(gridEl(), 'f', { ctrlKey: true });
    expect(e.defaultPrevented).toBe(false);
    expect(findInput()).toBeNull();
  });
});
