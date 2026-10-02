// Registered cell types: turn `{ cellType: 'money' }` columns into ordinary
// built-in columns, so everything downstream (format, sort, filter, export,
// aggregation) only ever sees the built-in types it already understands.

import type { BuiltinCellType, CellTypeDef, ColumnDef } from './column';

function resolveOne(col: ColumnDef, cellTypes: Record<string, CellTypeDef> | undefined, locale: string | undefined): ColumnDef {
  let out = col;
  if (col.type === undefined) {
    const { extends: base, ...defaults } = cellTypes?.[col.cellType] ?? {};
    const merged = { ...defaults, ...col };
    const draws = !!(merged.component || merged.render);
    const type: BuiltinCellType = base ?? (draws ? 'custom' : 'text');
    out = { ...merged, type } as ColumnDef;
  }
  if (locale && !out.locale) out = { ...out, locale } as ColumnDef;
  return out;
}

/** Resolve registered `cellType` columns against `cellTypes` and fill in the
    grid `locale` where a column has none. Returns the input array itself when
    nothing changes. Pure; use it to feed the same columns to `toCSV`,
    `printTable` or `pivot` outside the grid. */
export function resolveColumns(
  columns: readonly ColumnDef[],
  cellTypes?: Record<string, CellTypeDef>,
  locale?: string,
): ColumnDef[] {
  let changed = false;
  const out = columns.map((c) => {
    const r = resolveOne(c, cellTypes, locale);
    if (r !== c) changed = true;
    return r;
  });
  return changed ? out : (columns as ColumnDef[]);
}
