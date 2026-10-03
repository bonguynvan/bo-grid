// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync, createRawSnippet } from 'svelte';
import Grid from './Grid.svelte';
import type { ColumnDef, GridRow } from './column';
import type { GridApi } from './api';
import MountCounter, { mounts } from './test-fixtures/MountCounter.svelte';

// jsdom has no ResizeObserver (the grid measures its viewport with one).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

let cleanup: (() => void) | null = null;
afterEach(() => {
  cleanup?.();
  cleanup = null;
});

function render(columns: ColumnDef[], extra: Record<string, unknown> = {}) {
  const rows: GridRow[] = [
    { id: 1, sym: 'AAA', px: 10 },
    { id: 2, sym: 'BBB', px: 20 },
  ];
  let api: GridApi | undefined;
  const target = document.createElement('div');
  document.body.appendChild(target);
  const grid = mount(Grid, { target, props: { rows, columns, height: 200, onReady: (a: GridApi) => (api = a), ...extra } });
  flushSync();
  cleanup = () => {
    unmount(grid);
    target.remove();
  };
  return { rows, target, api: () => api! };
}

describe('component cells under api.patchRows', () => {
  it('update in place instead of remounting', () => {
    const { target, api } = render([{ type: 'text', key: 'px', header: 'Px', component: MountCounter }]);
    const cell = () => target.querySelector('.viewport .row .mc');
    const node = cell();
    const before = mounts.count;
    expect(node?.textContent).toBe('AAA:10');
    api().patchRows([[1, { px: 11 }]]);
    flushSync();
    expect(cell()?.textContent).toBe('AAA:11');
    expect(cell()).toBe(node);
    expect(mounts.count).toBe(before);
  });

  it('get the row object itself until it is patched, then a view of it', () => {
    const { rows, api } = render([{ type: 'text', key: 'px', header: 'Px', component: MountCounter }]);
    const second = rows[1];
    // The last cell rendered is the second row's.
    expect(mounts.row).toBe(second);
    api().patchRows([[2, { px: 21 }]]);
    flushSync();
    expect(mounts.row).not.toBe(second);
    expect(mounts.row?.px).toBe(21);
  });

  it('the `cell` snippet updates in place too', () => {
    let setups = 0;
    const cell = createRawSnippet((args: () => { row: GridRow }) => ({
      render: () => '<span class="snip"></span>',
      setup(node: Element) {
        setups++;
        $effect(() => {
          node.textContent = `${args().row.sym}:${args().row.px}`;
        });
      },
    }));
    const { target, api } = render([{ type: 'custom', key: 'px', header: 'Px' }], { cell });
    const snip = () => target.querySelector('.viewport .row .snip');
    const node = snip();
    const before = setups;
    expect(node?.textContent).toBe('AAA:10');
    api().patchRows([[1, { px: 12 }]]);
    flushSync();
    expect(snip()?.textContent).toBe('AAA:12');
    expect(snip()).toBe(node);
    expect(setups).toBe(before);
  });
});
