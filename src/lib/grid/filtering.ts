/**
 * Structured per-column filter model (v0.3). Pure and dependency-free so it can
 * be unit-tested and reused by both the in-memory `view` and a server source.
 * The header filter-menu UI (lazy-loaded) writes these; `passesFilters` applies
 * them. Filtering is a snapshot operation, not a per-frame one.
 */
import type { Component } from 'svelte';
import type { ColumnDef, GridRow } from './column';
import { isNumeric } from './column';
import type { GridLabels } from './labels';

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

/** A filter of a kind registered through <Grid filterTypes>: any JSON-safe
    shape carrying its `kind`. */
export interface CustomFilter {
  kind: string;
  [field: string]: unknown;
}

/** Any filter a column can hold: built-in or registered. */
export type AnyFilter = ColumnFilter | CustomFilter;

/** Props of a registered filter type's editor, drawn inside the filter menu. */
export interface FilterEditorProps<F extends CustomFilter = CustomFilter> {
  /** The draft: the active filter when the menu opened, or null. */
  filter: F | null;
  /** Replace the draft. Apply (or Enter) commits it; Clear removes the filter. */
  onChange: (next: F | null) => void;
  column: ColumnDef;
  /** The column's distinct values, when the type sets `needsValues`. */
  values: string[];
  labels: GridLabels;
}

/** A filter kind for <Grid filterTypes>; a column selects it with `filter: 'name'`. */
export interface FilterTypeDef<F extends CustomFilter = CustomFilter> {
  /** Does one cell value pass? Called only while the filter is active. */
  test: (value: unknown, filter: F, row: GridRow) => boolean;
  /** Is the filter narrowing anything? Default: always active. */
  isActive?: (filter: F) => boolean;
  /** Editor for the middle of the filter menu. */
  component: Component<FilterEditorProps<F>>;
  /** Collect the column's distinct values for the editor (like the set filter). */
  needsValues?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FilterTypes = Record<string, FilterTypeDef<any>>;

const BUILTIN_KINDS: ReadonlySet<string> = new Set<FilterKind>(['text', 'number', 'date', 'set']);

export function isBuiltinFilter(f: AnyFilter): f is ColumnFilter {
  return BUILTIN_KINDS.has(f.kind);
}

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

/** Whether a filter actually constrains anything (else it's a no-op). A kind
    that is neither built-in nor registered is inactive: a grid that silently
    empties is worse than one that silently does not filter. */
export function isFilterActive(f: AnyFilter | undefined | null, types?: FilterTypes): boolean {
  if (!f) return false;
  if (!isBuiltinFilter(f)) {
    const def = types?.[f.kind];
    return !!def && (def.isActive ? def.isActive(f) : true);
  }
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
export function matchesFilter(value: unknown, f: AnyFilter, row?: GridRow, types?: FilterTypes): boolean {
  if (!isFilterActive(f, types)) return true;
  if (!isBuiltinFilter(f)) return (types as FilterTypes)[f.kind].test(value, f, row ?? ({ id: 0 } as GridRow));
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

/** Resolve a column's value for filtering — `row[key]` by default; Grid passes a
    computed-aware resolver so computed columns filter on their derived value. */
export type ValueResolver = (row: GridRow, key: string) => unknown;
const byKey: ValueResolver = (row, key) => row[key];

/** AND across every active per-column filter. */
export function passesFilters(
  row: GridRow,
  filters: Record<string, AnyFilter>,
  valueOf: ValueResolver = byKey,
  types?: FilterTypes,
): boolean {
  for (const key in filters) {
    const f = filters[key];
    if (isFilterActive(f, types) && !matchesFilter(valueOf(row, key), f, row, types)) return false;
  }
  return true;
}

/** Sorted unique string values for a column — the set-filter checklist. */
export function distinctValues(
  rows: readonly GridRow[],
  key: string,
  valueOf: ValueResolver = byKey,
): string[] {
  const seen = new Set<string>();
  for (const row of rows) seen.add(String(valueOf(row, key) ?? ''));
  return [...seen].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
}
