/**
 * Structured per-column filter model (v0.3). Pure and dependency-free so it can
 * be unit-tested and reused by both the in-memory `view` and a server source.
 * The header filter-menu UI (lazy-loaded) writes these; `passesFilters` applies
 * them. Filtering is a snapshot operation, not a per-frame one.
 */
import type { ColumnDef, GridRow } from './column';
import { isNumeric } from './column';

export type FilterKind = 'text' | 'number' | 'date' | 'set';
export type TextOp = 'contains' | 'notContains' | 'equals' | 'starts' | 'ends';
export type NumberOp = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge' | 'between';
export type DateOp = 'before' | 'after' | 'on' | 'between';

export type ColumnFilter =
  | { kind: 'text'; op: TextOp; q: string }
  | { kind: 'number'; op: NumberOp; a: number; b?: number }
  | { kind: 'date'; op: DateOp; a: number; b?: number }
  // Set filter holds the *excluded* values (the unchecked boxes); a row passes
  // when its value is not excluded. Empty list = everything passes.
  | { kind: 'set'; excluded: string[] };

const DAY = 86_400_000;

/** Pick the default filter control for a column from its type. */
export function defaultFilterKind(col: ColumnDef): FilterKind {
  if (col.type === 'date') return 'date';
  if (isNumeric(col)) return 'number';
  return 'text';
}

/** A fresh, inactive filter of the given kind (the menu's starting state). */
export function emptyFilter(kind: FilterKind): ColumnFilter {
  switch (kind) {
    case 'number':
      return { kind: 'number', op: 'eq', a: NaN };
    case 'date':
      return { kind: 'date', op: 'on', a: NaN };
    case 'set':
      return { kind: 'set', excluded: [] };
    default:
      return { kind: 'text', op: 'contains', q: '' };
  }
}

/** Whether a filter actually constrains anything (else it's a no-op). */
export function isFilterActive(f: ColumnFilter | undefined | null): boolean {
  if (!f) return false;
  switch (f.kind) {
    case 'text':
      return f.q.trim().length > 0;
    case 'number':
    case 'date':
      return Number.isFinite(f.a) && (f.op !== 'between' || Number.isFinite(f.b));
    case 'set':
      return f.excluded.length > 0;
  }
}

/** Does one cell value satisfy one filter? An inactive filter passes everything. */
export function matchesFilter(value: unknown, f: ColumnFilter): boolean {
  if (!isFilterActive(f)) return true;
  switch (f.kind) {
    case 'text': {
      const hay = String(value ?? '').toLowerCase();
      const q = f.q.trim().toLowerCase();
      if (f.op === 'contains') return hay.includes(q);
      if (f.op === 'notContains') return !hay.includes(q);
      if (f.op === 'equals') return hay === q;
      if (f.op === 'starts') return hay.startsWith(q);
      return hay.endsWith(q); // 'ends'
    }
    case 'set':
      return !f.excluded.includes(String(value ?? ''));
    case 'number':
    case 'date': {
      // Empty/blank cells aren't numbers (Number(null)/Number('') coerce to 0),
      // so exclude them explicitly while a number/date filter is active.
      if (value === null || value === undefined || value === '') return false;
      const n = Number(value);
      if (!Number.isFinite(n)) return false; // non-numeric is excluded while active
      if (f.kind === 'date' && f.op === 'on') {
        return Math.floor(n / DAY) === Math.floor(f.a / DAY); // same (UTC) day
      }
      switch (f.op) {
        case 'eq':
          return n === f.a;
        case 'ne':
          return n !== f.a;
        case 'lt':
        case 'before':
          return n < f.a;
        case 'le':
          return n <= f.a;
        case 'gt':
        case 'after':
          return n > f.a;
        case 'ge':
          return n >= f.a;
        case 'between':
          return n >= f.a && n <= (f.b ?? Infinity);
      }
    }
  }
  return true; // unreachable fallback
}

/** AND across every active per-column filter. */
export function passesFilters(row: GridRow, filters: Record<string, ColumnFilter>): boolean {
  for (const key in filters) {
    const f = filters[key];
    if (isFilterActive(f) && !matchesFilter(row[key], f)) return false;
  }
  return true;
}

/** Sorted unique string values for a column — the set-filter checklist. */
export function distinctValues(rows: readonly GridRow[], key: string): string[] {
  const seen = new Set<string>();
  for (const row of rows) seen.add(String(row[key] ?? ''));
  return [...seen].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}
