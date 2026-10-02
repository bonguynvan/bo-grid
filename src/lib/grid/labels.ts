// Every string the grid renders itself, in one flat record. Consumers override
// individual entries through the `labels` prop; interpolated entries are
// functions so a translation can reorder the parts.

export interface GridLabels {
  sortAscending: string;
  sortDescending: string;
  clearSort: string;
  filterEllipsis: string;
  pinLeft: string;
  pinRight: string;
  unpin: string;
  autosize: string;
  hideColumn: string;
  columnMenu: (header: string) => string;
  resizeColumn: (header: string) => string;
  filterFor: (header: string) => string;
  operator: string;
  value: string;
  upperValue: string;
  and: string;
  blank: string;
  opContains: string;
  opNotContains: string;
  opEquals: string;
  opStartsWith: string;
  opEndsWith: string;
  opBetween: string;
  opBefore: string;
  opAfter: string;
  opOn: string;
  date: string;
  endDate: string;
  apply: string;
  clear: string;
  all: string;
  none: string;
  searchValues: string;
  searchPlaceholder: string;
  filterPlaceholder: string;
  valuePlaceholder: string;
  columns: string;
  showAll: string;
  searchColumns: string;
  quickFilter: string;
  selectRow: string;
  selectAllRows: string;
  toggleDetail: string;
  toggleChildren: string;
  dragToReorder: string;
  fill: string;
  noRows: string;
  rating: (value: number, max: number) => string;
  pagination: string;
  rowsPerPage: string;
  rows: string;
  firstPage: string;
  lastPage: string;
  previous: string;
  next: string;
  pageOf: (page: number, pageCount: number, total: number, locale?: string) => string;
  pageRange: (from: number, to: number, total: number) => string;
}

export const DEFAULT_LABELS: GridLabels = {
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',
  filterEllipsis: 'Filter…',
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  autosize: 'Autosize',
  hideColumn: 'Hide column',
  columnMenu: (h) => `${h} menu`,
  resizeColumn: (h) => `Resize ${h}`,
  filterFor: (h) => `Filter ${h}`,
  operator: 'Operator',
  value: 'Value',
  upperValue: 'Upper value',
  and: 'and',
  blank: '(blank)',
  opContains: 'Contains',
  opNotContains: 'Not contains',
  opEquals: 'Equals',
  opStartsWith: 'Starts with',
  opEndsWith: 'Ends with',
  opBetween: 'Between',
  opBefore: 'Before',
  opAfter: 'After',
  opOn: 'On',
  date: 'Date',
  endDate: 'End date',
  apply: 'Apply',
  clear: 'Clear',
  all: 'All',
  none: 'None',
  searchValues: 'Search values',
  searchPlaceholder: 'search…',
  filterPlaceholder: 'filter…',
  valuePlaceholder: 'value',
  columns: 'Columns',
  showAll: 'Show all',
  searchColumns: 'Search columns',
  quickFilter: 'Quick filter',
  selectRow: 'Select row',
  selectAllRows: 'Select all rows',
  toggleDetail: 'Toggle detail',
  toggleChildren: 'Toggle children',
  dragToReorder: 'Drag to reorder row',
  fill: 'Fill',
  noRows: 'No matching rows',
  rating: (v, max) => `${v} out of ${max}`,
  pagination: 'Pagination',
  rowsPerPage: 'Rows per page',
  rows: 'Rows',
  firstPage: 'First page',
  lastPage: 'Last page',
  previous: '‹ Prev',
  next: 'Next ›',
  pageOf: (p, n, total, locale) => `Page ${p} of ${n} · ${total.toLocaleString(locale)} rows`,
  pageRange: (from, to, total) => `${from}–${to} of ${total}`,
};

/** Merge overrides over the defaults. Undefined values fall back to the default. */
export function resolveLabels(overrides?: Partial<GridLabels>): GridLabels {
  if (!overrides) return DEFAULT_LABELS;
  const out: GridLabels = { ...DEFAULT_LABELS };
  for (const k of Object.keys(overrides) as Array<keyof GridLabels>) {
    const v = overrides[k];
    if (v !== undefined) (out as unknown as Record<string, unknown>)[k] = v;
  }
  return out;
}
