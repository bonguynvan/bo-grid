import { describe, it, expect } from 'vitest';
import { buildTreeRows, type TreeAccess } from './tree';
import type { GridRow } from './column';

const node = (id: number, children?: GridRow[]): GridRow =>
  ({ id, flashSeq: 0, flashDir: 'up', children }) as unknown as GridRow;

const kids = (r: GridRow) => (r as { children?: GridRow[] }).children;

/* eslint-disable @typescript-eslint/no-explicit-any */
const ids = (rows: ReturnType<typeof buildTreeRows>) => rows.map((r) => (r as any).row?.id ?? '·');

// Sync access from an `isExpanded` predicate (mirrors getChildren mode).
const sync = (isExpanded: (r: GridRow) => boolean): TreeAccess => ({
  childrenOf: kids,
  hasChildren: (r) => !!kids(r)?.length,
  isExpanded,
});

describe('buildTreeRows', () => {
  const tree = [node(1, [node(11), node(12, [node(121)])]), node(2)];

  it('shows only roots when nothing is expanded', () => {
    const rows = buildTreeRows(tree, sync(() => false));
    expect(ids(rows)).toEqual([1, 2]);
    expect((rows[0] as any).hasChildren).toBe(true);
    expect((rows[1] as any).hasChildren).toBe(false);
  });

  it('expands a node to reveal its children one level deeper', () => {
    const rows = buildTreeRows(tree, sync((r) => r.id === 1));
    expect(ids(rows)).toEqual([1, 11, 12, 2]);
    expect((rows[1] as any).depth).toBe(1);
    expect((rows[2] as any).hasChildren).toBe(true);
  });

  it('expands nested nodes in pre-order DFS', () => {
    const rows = buildTreeRows(tree, sync((r) => r.id === 1 || r.id === 12));
    expect(ids(rows)).toEqual([1, 11, 12, 121, 2]);
    expect((rows[3] as any).depth).toBe(2);
  });
});

describe('buildTreeRows — async/lazy', () => {
  const roots = [node(1), node(2)]; // children loaded lazily, not embedded
  const base = (over: Partial<TreeAccess>): TreeAccess => ({
    childrenOf: () => undefined,
    hasChildren: (r) => r.id === 1, // node 1 is a folder
    isExpanded: () => false,
    isLoading: () => false,
    ...over,
  });

  it('shows a chevron from hasChildren even when children are unloaded', () => {
    const rows = buildTreeRows(roots, base({}));
    expect((rows[0] as any).hasChildren).toBe(true);
    expect((rows[1] as any).hasChildren).toBe(false);
  });

  it('inserts a loading placeholder under an expanded, still-loading node', () => {
    const rows = buildTreeRows(roots, base({ isExpanded: (r) => r.id === 1, isLoading: (r) => r.id === 1 }));
    expect(rows.map((r) => r.kind)).toEqual(['data', 'treeloading', 'data']);
    expect((rows[1] as any).depth).toBe(1);
  });

  it('renders loaded children from the cache instead of the placeholder', () => {
    const cache = new Map<number, GridRow[]>([[1, [node(11), node(12)]]]);
    const rows = buildTreeRows(
      roots,
      base({ childrenOf: (r) => cache.get(r.id as number), isExpanded: (r) => r.id === 1 }),
    );
    expect(ids(rows)).toEqual([1, 11, 12, 2]);
    expect(rows.some((r) => r.kind === 'treeloading')).toBe(false);
  });
});
