import { describe, it, expect } from 'vitest';
import { buildTreeRows } from './tree';
import type { GridRow } from './column';

const node = (id: number, children?: GridRow[]): GridRow =>
  ({ id, flashSeq: 0, flashDir: 'up', children }) as unknown as GridRow;

const getChildren = (r: GridRow) => (r as { children?: GridRow[] }).children;

describe('buildTreeRows', () => {
  const tree = [
    node(1, [node(11), node(12, [node(121)])]),
    node(2),
  ];

  it('shows only roots when nothing is expanded', () => {
    const rows = buildTreeRows(tree, getChildren, () => false);
    expect(rows.map((r) => (r as { row: GridRow }).row.id)).toEqual([1, 2]);
    expect((rows[0] as { hasChildren: boolean }).hasChildren).toBe(true);
    expect((rows[1] as { hasChildren: boolean }).hasChildren).toBe(false);
  });

  it('expands a node to reveal its children one level deeper', () => {
    const rows = buildTreeRows(tree, getChildren, (r) => r.id === 1);
    expect(rows.map((r) => (r as { row: GridRow }).row.id)).toEqual([1, 11, 12, 2]);
    expect((rows[1] as { depth: number }).depth).toBe(1);
    expect((rows[2] as { hasChildren: boolean }).hasChildren).toBe(true); // 12 has a child
  });

  it('expands nested nodes in pre-order DFS', () => {
    const rows = buildTreeRows(tree, getChildren, (r) => r.id === 1 || r.id === 12);
    expect(rows.map((r) => (r as { row: GridRow }).row.id)).toEqual([1, 11, 12, 121, 2]);
    expect((rows[3] as { depth: number }).depth).toBe(2);
  });
});
