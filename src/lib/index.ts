// Public API for the bo-grid package.
// Consumers: `import { Grid, type ColumnDef } from 'bo-grid';`
//
// This surface is intentionally small — every export is a compatibility promise.
// Internal helpers (layout, sorting, grouping, selection internals) are NOT
// exported; they can change freely between versions.

// Components
export { default as Grid } from './grid/Grid.svelte';
export { default as Sparkline } from './sparkline/Sparkline.svelte';

// Column + grid configuration types
export type { ColumnDef, Align, GridRow, SortDir, SortState, CellEditEvent } from './grid/column';
export type { AggKind, AggResult } from './grid/aggregate';

// Value formatters (handy when building custom cell content)
export { fmtPrice, fmtPercent, fmtVolume, fmtDate } from './format/format';
export type { DateStyle } from './format/format';

// Standalone helpers
export { aggregate } from './grid/aggregate';
export { heatColor } from './grid/heatmap';

// Theming
export { themeVars, darkTheme, lightTheme } from './grid/theme';
export type { GridTheme } from './grid/theme';

// Sparkline canvas primitives (draw candlesticks on your own canvas)
export { drawCandles, setupHiDpiCanvas } from './sparkline/sparkline-render';

// Export (CSV is dependency-free; XLSX dynamic-imports the optional `xlsx` peer)
export { toCSV, exportCSV } from './grid/export';
export { exportXLSX } from './grid/export-xlsx';
export type { ExportOptions } from './grid/export';

// Server-side / windowed data source
export { createArraySource } from './grid/source';
export type {
  RowSource,
  RowRange,
  RowSourceParams,
  RowSourceResult,
  ArraySourceOptions,
} from './grid/source';

// Shared types
export type { Candle } from './types';
