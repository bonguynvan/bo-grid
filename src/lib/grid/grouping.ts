import type { GridRow } from './column';

export interface GroupNode {
  /** Unique path, e.g. "Tech" or "Tech/NYSE" for nested groups. */
  path: string;
  /** Nesting level, 0 = outermost. */
  depth: number;
  /** The group key value (stringified). */
  value: string;
  /** All leaf data rows under this group (across nested sub-groups). */
  rows: GridRow[];
  count: number;
  collapsed: boolean;
}

export type VisualRow =
  | { kind: 'data'; row: GridRow; depth?: number; hasChildren?: boolean }
  | { kind: 'group'; group: GroupNode };

/**
 * Flatten data rows into the visual row list the grid renders: a stream of
 * group-header rows interleaved with their data rows, honoring collapse state.
 * Collapsed groups omit their children entirely. Reads only the group-key
 * fields (which are static), so a realtime tick never rebuilds this list.
 *
 * Group headers are the same height as data rows, so the uniform-height virtual
 * scroller works unchanged — it just windows over a longer mixed list.
 */
export function buildFlatRows(
  rows: GridRow[],
  groupBy: string[],
  collapsed: Set<string>,
): VisualRow[] {
  if (groupBy.length === 0) return rows.map((row) => ({ kind: 'data', row }) as VisualRow);

  const out: VisualRow[] = [];

  const recurse = (subset: GridRow[], depth: number, parentPath: string): void => {
    const key = groupBy[depth];
    const buckets = new Map<string, GridRow[]>();
    for (const row of subset) {
      const gv = String(row[key] ?? '');
      const arr = buckets.get(gv);
      if (arr) arr.push(row);
      else buckets.set(gv, [row]);
    }

    for (const gv of [...buckets.keys()].sort()) {
      const groupRows = buckets.get(gv)!;
      const path = parentPath ? `${parentPath}/${gv}` : gv;
      const isCollapsed = collapsed.has(path);
      out.push({
        kind: 'group',
        group: { path, depth, value: gv, rows: groupRows, count: groupRows.length, collapsed: isCollapsed },
      });
      if (isCollapsed) continue;
      if (depth + 1 < groupBy.length) recurse(groupRows, depth + 1, path);
      else for (const row of groupRows) out.push({ kind: 'data', row });
    }
  };

  recurse(rows, 0, '');
  return out;
}

/**
 * The chain of group nodes (outermost → innermost) that the row at `idx` belongs
 * to. Used to render sticky group headers: scan backward from idx, taking the
 * nearest preceding header at each depth until the depth-0 group is found.
 */
export function activeGroupsAt(flat: VisualRow[], idx: number): GroupNode[] {
  const found = new Map<number, GroupNode>();
  for (let i = Math.min(idx, flat.length - 1); i >= 0; i--) {
    const item = flat[i];
    if (item.kind !== 'group') continue;
    if (!found.has(item.group.depth)) found.set(item.group.depth, item.group);
    if (item.group.depth === 0) break;
  }
  return [...found.values()].sort((a, b) => a.depth - b.depth);
}
