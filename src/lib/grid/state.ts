import type { SortState } from './column';
import type { AnyFilter } from './filtering';
import type { WidthMap } from './sizing';

/** Bumped when the shape changes incompatibly. A saved state from another
    version is dropped whole — half a layout is worse than none. */
export const GRID_STATE_VERSION = 1;

export type PinSide = 'left' | 'right' | false;

/** The user's layout: everything they can rearrange, as one plain object. */
export interface GridState {
  version: number;
  /** Column keys in display order. */
  order: string[];
  /** Width overrides (px) from resizing, by column key. */
  widths: WidthMap;
  /** Keys of columns hidden at runtime. */
  hidden: string[];
  /** Runtime pin overrides, by column key. */
  pinned: Record<string, PinSide>;
  sorts: SortState[];
  filters: Record<string, AnyFilter>;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Fit an arrangement of keys onto the columns as declared now. Unknown keys
    drop out, survivors keep their relative order, and a column the arrangement
    never knew goes right after the nearest column declared before it (or first),
    so a newly added column appears where its author put it. */
export function placeColumns(arranged: readonly string[], declared: readonly string[]): string[] {
  const known = new Set(declared);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of arranged) {
    if (!known.has(k) || seen.has(k)) continue;
    out.push(k);
    seen.add(k);
  }
  declared.forEach((k, i) => {
    if (seen.has(k)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const p = out.indexOf(declared[j]);
      if (p >= 0) {
        at = p + 1;
        break;
      }
    }
    out.splice(at, 0, k);
    seen.add(k);
  });
  return out;
}

/** Fit a saved state onto the columns as they are now. Saved layouts outlive
    the code that wrote them — columns get renamed, dropped and added — so
    entries for missing columns are discarded and malformed fields ignored.
    Returns null for a foreign version or a non-object. Pure; never mutates. */
export function reconcileState(saved: unknown, columnKeys: readonly string[]): GridState | null {
  if (!isRecord(saved) || saved.version !== GRID_STATE_VERSION) return null;
  const exists = new Set(columnKeys);

  const order = placeColumns(Array.isArray(saved.order) ? saved.order.filter((k): k is string => typeof k === 'string') : [], columnKeys);

  const widths: WidthMap = {};
  if (isRecord(saved.widths)) {
    for (const [k, w] of Object.entries(saved.widths)) {
      if (exists.has(k) && typeof w === 'number' && Number.isFinite(w) && w > 0) widths[k] = w;
    }
  }

  const hidden = Array.isArray(saved.hidden)
    ? [...new Set(saved.hidden.filter((k): k is string => typeof k === 'string' && exists.has(k)))]
    : [];

  const pinned: Record<string, PinSide> = {};
  if (isRecord(saved.pinned)) {
    for (const [k, side] of Object.entries(saved.pinned)) {
      if (exists.has(k) && (side === 'left' || side === 'right' || side === false)) pinned[k] = side;
    }
  }

  const sorts: SortState[] = [];
  if (Array.isArray(saved.sorts)) {
    for (const s of saved.sorts) {
      if (isRecord(s) && typeof s.key === 'string' && exists.has(s.key) && (s.dir === 'asc' || s.dir === 'desc')) {
        sorts.push({ key: s.key, dir: s.dir });
      }
    }
  }

  const filters: Record<string, AnyFilter> = {};
  if (isRecord(saved.filters)) {
    for (const [k, f] of Object.entries(saved.filters)) {
      if (exists.has(k) && isRecord(f) && typeof f.kind === 'string') filters[k] = f as unknown as AnyFilter;
    }
  }

  return { version: GRID_STATE_VERSION, order, widths, hidden, pinned, sorts, filters };
}
