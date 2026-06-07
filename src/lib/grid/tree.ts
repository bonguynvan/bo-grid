import type { GridRow } from './column';
import type { VisualRow } from './grouping';

/** Resolve a row's children (undefined/empty = leaf). Sync. */
export type GetChildren = (row: GridRow) => GridRow[] | undefined;

/** How the flattener reads a tree: which rows have children, which are expanded,
    the children currently available (sync result or async cache), and which
    expanded nodes are still loading. */
export interface TreeAccess {
  /** Children available now (sync result or loaded cache); undefined = not loaded. */
  childrenOf: (row: GridRow) => readonly GridRow[] | undefined;
  /** Cheap predicate: does this row have children? (Drives the expand chevron.) */
  hasChildren: (row: GridRow) => boolean;
  isExpanded: (row: GridRow) => boolean;
  /** Whether an expanded row's children are still loading (async trees). */
  isLoading?: (row: GridRow) => boolean;
}

/**
 * Flatten a tree of rows into the visible, depth-tagged rows the grid renders.
 * Pre-order DFS: each node is emitted, then — if it has children and is expanded
 * — its loaded children one level deeper, or a single `treeloading` placeholder
 * while they load. Pure: no row values are read, so a realtime tick never rebuilds
 * this list.
 */
export function buildTreeRows(roots: readonly GridRow[], access: TreeAccess): VisualRow[] {
  const { childrenOf, hasChildren, isExpanded, isLoading } = access;
  const out: VisualRow[] = [];
  const walk = (nodes: readonly GridRow[], depth: number): void => {
    for (const row of nodes) {
      const has = hasChildren(row);
      out.push({ kind: 'data', row, depth, hasChildren: has });
      if (has && isExpanded(row)) {
        const children = childrenOf(row);
        if (children && children.length > 0) walk(children, depth + 1);
        else if (isLoading?.(row)) out.push({ kind: 'treeloading', depth: depth + 1 });
      }
    }
  };
  walk(roots, 0);
  return out;
}
