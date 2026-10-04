// Mount a <Grid> in jsdom for component tests (files named *.svelte.test.ts
// with `// @vitest-environment jsdom`).
import { mount, unmount, flushSync } from 'svelte';
import Grid from '../Grid.svelte';
import type { GridRow } from '../column';
import type { GridApi } from '../api';

// jsdom has no ResizeObserver (the grid measures its viewport with one).
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

export interface MountedGrid {
  rows: GridRow[];
  target: HTMLElement;
  api: () => GridApi;
  destroy: () => void;
}

/** Mount a grid with two rows ({ id, sym, px }) unless `props.rows` says otherwise. */
export function mountGrid(props: Record<string, unknown>): MountedGrid {
  const rows = (props.rows as GridRow[] | undefined) ?? [
    { id: 1, sym: 'AAA', px: 10 },
    { id: 2, sym: 'BBB', px: 20 },
  ];
  let api: GridApi | undefined;
  const target = document.createElement('div');
  document.body.appendChild(target);
  const grid = mount(Grid, { target, props: { height: 200, onReady: (a: GridApi) => (api = a), ...props, rows } as never });
  flushSync();
  return {
    rows,
    target,
    api: () => api!,
    destroy: () => {
      unmount(grid);
      target.remove();
    },
  };
}
