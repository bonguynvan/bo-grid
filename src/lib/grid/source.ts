import type { GridRow, SortState } from './column';
import { compareBySorts } from './column';
import { passesFilters, type ColumnFilter } from './filtering';

export interface RowRange {
  /** First row index (inclusive). */
  start: number;
  /** One past the last row index (exclusive). */
  end: number;
}

export interface RowSourceParams {
  range: RowRange;
  /** Primary sort key, or null. Equals `sorts[0] ?? null`; kept for sources
      that only support single-column sort. */
  sort: SortState | null;
  /** Full sort order (primary first) for multi-column sort. May be empty. */
  sorts?: SortState[];
  filter: string;
  /** Structured per-column filters (header filter menu), keyed by column key. */
  columnFilters?: Record<string, ColumnFilter>;
}

export interface RowSourceResult {
  /** Rows for the requested range, in order. */
  rows: GridRow[];
  /** Total rows matching the current sort/filter (drives the scrollbar). */
  total: number;
}

/**
 * A windowed, sort/filter-aware row provider. Implement this to back the grid
 * with paginated/server data instead of an in-memory array. The grid asks only
 * for the visible window plus overscan, so the dataset can be far larger than
 * memory. Results may be returned synchronously or as a Promise.
 */
export interface RowSource {
  getRows(params: RowSourceParams): RowSourceResult | Promise<RowSourceResult>;
}

export interface ArraySourceOptions {
  /** Artificial latency (ms) to simulate a network round-trip. Default 0. */
  latency?: number;
  /** Row keys to match when filtering. Omit to disable filtering. */
  filterKeys?: string[];
}

/**
 * Adapt an in-memory array to the RowSource interface — applies sort/filter and
 * slices the requested range. Useful as a real client-side adapter and for
 * exercising the server-side code path in tests/demos (set `latency`).
 */
export function createArraySource(all: readonly GridRow[], opts: ArraySourceOptions = {}): RowSource {
  const { latency = 0, filterKeys } = opts;

  function compute(params: RowSourceParams): RowSourceResult {
    let rows: readonly GridRow[] = all;
    const f = params.filter.trim().toLowerCase();
    if (f && filterKeys && filterKeys.length > 0) {
      rows = rows.filter((r) => filterKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(f)));
    }
    const cf = params.columnFilters;
    if (cf && Object.keys(cf).length > 0) {
      rows = rows.filter((r) => passesFilters(r, cf));
    }
    const sorts = params.sorts?.length ? params.sorts : params.sort ? [params.sort] : [];
    if (sorts.length > 0) {
      rows = [...rows].sort((a, b) => compareBySorts(a, b, sorts));
    }
    const total = rows.length;
    return { rows: rows.slice(params.range.start, params.range.end), total };
  }

  return {
    getRows(params) {
      if (latency <= 0) return compute(params);
      return new Promise((resolve) => setTimeout(() => resolve(compute(params)), latency));
    },
  };
}
