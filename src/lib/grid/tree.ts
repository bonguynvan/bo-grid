import type { GridRow } from './column';
import type { VisualRow } from './grouping';

/** Resolve a row's children (undefined/empty = leaf). */
export type GetChildren = (row: GridRow) => GridRow[] | undefined;

/**
 * Flatten a tree of rows into the visible, depth-tagged data rows the grid
 * renders. Pre-order DFS: each node is emitted, then — if it has children and
 * `isExpanded` returns true — its children, one level deeper. Collapsed or leaf
 * nodes contribute only themselves. Pure: no row values are read, so a realtime
 * tick never rebuilds this list.
 */
export function buildTreeRows(
  roots: readonly GridRow[],
  getChildren: GetChildren,
  isExpanded: (row: GridRow) => boolean,
): VisualRow[] {
  const out: VisualRow[] = [];
  const walk = (nodes: readonly GridRow[], depth: number): void => {
    for (const row of nodes) {
      const children = getChildren(row);
      const hasChildren = !!children && children.length > 0;
      out.push({ kind: 'data', row, depth, hasChildren });
      if (hasChildren && isExpanded(row)) walk(children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}
