// Registered cell types: turn `{ cellType: 'money' }` columns into ordinary
// built-in columns, so everything downstream (format, sort, filter, export,
// aggregation) only ever sees the built-in types it already understands.

import type { BuiltinCellType, CellTypeDef, ColBase, ColumnDef } from './column';

/** Settings applied under every column (AG Grid's `defaultColDef`). */
export type DefaultColumn = Omit<Partial<ColBase>, 'key' | 'header'>;

function resolveOne(
  col: ColumnDef,
  cellTypes: Record<string, CellTypeDef> | undefined,
  locale: string | undefined,
  base: DefaultColumn | undefined,
): ColumnDef {
  let out = base ? ({ ...base, ...col } as ColumnDef) : col;
  if (out.type === undefined) {
    const { extends: kind, ...defaults } = cellTypes?.[out.cellType] ?? {};
    const merged = { ...base, ...defaults, ...col };
    const draws = !!(merged.component || merged.render);
    const type: BuiltinCellType = kind ?? (draws ? 'custom' : 'text');
    out = { ...merged, type } as ColumnDef;
  }
  if (locale && !out.locale) out = { ...out, locale } as ColumnDef;
  return out;
}

/** Resolve registered `cellType` columns against `cellTypes`, apply the shared
    `defaults` under every column (defaults < registered type < column), and
    fill in the grid `locale` where a column has none. Returns the input array
    itself when nothing changes. Pure; use it to feed the same columns to
    `toCSV`, `printTable` or `pivot` outside the grid. */
export function resolveColumns(
  columns: readonly ColumnDef[],
  cellTypes?: Record<string, CellTypeDef>,
  locale?: string,
  defaults?: DefaultColumn,
): ColumnDef[] {
  const base = defaults && Object.keys(defaults).length ? defaults : undefined;
  let changed = false;
  const out = columns.map((c) => {
    const r = resolveOne(c, cellTypes, locale, base);
    if (r !== c) changed = true;
    return r;
  });
  return changed ? out : (columns as ColumnDef[]);
}
