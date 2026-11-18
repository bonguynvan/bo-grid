// Public API for the bo-grid package.
// Consumers: `import { Grid, type ColumnDef } from 'bo-grid';`
//
// This surface is intentionally small — every export is a compatibility promise.
// Internal helpers (layout, sorting, grouping, selection internals) are NOT
// exported; they can change freely between versions.

// Components
import type { ComponentProps } from 'svelte';
import type GridComponent from './grid/Grid.svelte';
export { default as Grid } from './grid/Grid.svelte';
export { default as Sparkline } from './sparkline/Sparkline.svelte';

/** Every `<Grid>` prop, as one object type. Use it to type a config object —
    especially the `<bo-grid>` web component's `config` (see `bo-grid/element`). */
export type GridProps = ComponentProps<typeof GridComponent>;

// Server-side (lazy) grouping summary type (for the `lazyGroups` prop)
export type { LazyGroup } from './grid/grouping.js';

// Column + grid configuration types
export type {
  ColumnDef,
  Align,
  GridRow,
  SortDir,
  SortState,
  CellEditEvent,
  CellRenderContext,
  BadgeTone,
  DataBarConfig,
  IconRule,
  ColorScaleConfig,
  CellTypeDef,
  CellTypeProps,
  CellEditorProps,
  BuiltinCellType,
  ShowChangeOptions,
} from './grid/column.js';
export { resolveColumns } from './grid/celltype.js';
export { sortRows } from './grid/column.js';
export type { DefaultColumn } from './grid/celltype.js';
export type { Hotkeys, HotkeyHandler, HotkeyContext } from './grid/hotkeys.js';
export type { AggKind, AggResult } from './grid/aggregate.js';

// Column filter model (for controlled filtering via `columnFilters`/`onFilterChange`)
export type {
  ColumnFilter,
  FilterKind,
  TextOp,
  NumberOp,
  DateOp,
  AnyFilter,
  CustomFilter,
  FilterEditorProps,
  FilterTypeDef,
  FilterTypes,
} from './grid/filtering.js';

// Value formatters (handy when building custom cell content)
export { fmtPrice, fmtPercent, fmtVolume, fmtDate, fmtCurrency, relativeTime } from './format/format.js';
export type { DateStyle } from './format/format.js';

// Standalone helpers
export { aggregate } from './grid/aggregate.js';
export { heatColor } from './grid/heatmap.js';
export { pivot } from './grid/pivot.js';
export type { PivotConfig, PivotResult } from './grid/pivot.js';

// Theming
export {
  themeVars,
  darkTheme,
  lightTheme,
  highContrastDark,
  highContrastLight,
  midnightTheme,
  terminalTheme,
  tradecanvasTheme,
  tradecanvasLightTheme,
  themePresets,
} from './grid/theme.js';
export type { GridTheme, ThemePreset } from './grid/theme.js';
export { DEFAULT_LABELS, resolveLabels } from './grid/labels.js';
export { reconcileState, GRID_STATE_VERSION } from './grid/state.js';
export { buildMergePlan, colSpanRow } from './grid/merge.js';
export type { MergePlan, MergeInput, SpanRun } from './grid/merge.js';
export type { GridState } from './grid/state.js';
export type { GridApi, ScrollAlign, ViewportRange, FlashCellsOptions } from './grid/api.js';
export type { GridLabels } from './grid/labels.js';

// Sparkline canvas primitives (draw candlesticks on your own canvas)
export { drawCandles, setupHiDpiCanvas } from './sparkline/sparkline-render.js';

// Export + import (CSV is dependency-free; XLSX dynamic-imports the optional `xlsx` peer)
export {
  toCSV,
  exportCSV,
  parseCSV,
  parseCSVMatrix,
  parseTSV,
  parseJSON,
  parseRows,
  rowsFromObjects,
} from './grid/export.js';
export { exportXLSX } from './grid/export-xlsx.js';
export type { ExportOptions } from './grid/export.js';

// Printable / export HTML (renders ALL rows, unlike the virtualized grid)
export { toHTMLTable, printTable, escapeHTML } from './grid/print.js';

// Server-side / windowed data source
export { createArraySource } from './grid/source.js';
export type {
  RowSource,
  RowRange,
  RowSourceParams,
  RowSourceResult,
  ArraySourceOptions,
} from './grid/source.js';

// Shared types
export type { Candle } from './types.js';
// Errors bo-grid throws carry a stable `code` (BG1001…), the fix and a docs link.
export type { BoGridError, BoGridErrorCode } from './errors.js';
