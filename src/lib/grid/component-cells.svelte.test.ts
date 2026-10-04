// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { flushSync, createRawSnippet } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import MountCounter, { mounts } from './test-fixtures/MountCounter.svelte';
import { mountGrid, type MountedGrid } from './test-fixtures/mount-grid';

let grid: MountedGrid | null = null;
afterEach(() => {
  grid?.destroy();
  grid = null;
});

function render(columns: ColumnDef[], extra: Record<string, unknown> = {}) {
  grid = mountGrid({ columns, ...extra });
  return grid;
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
