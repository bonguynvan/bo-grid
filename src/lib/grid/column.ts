import type { Candle } from '../types';
import { fmtPrice, fmtPercent, fmtVolume, fmtDate, fmtCurrency, relativeTime, type DateStyle } from '../format/format';
import type { AggKind } from './aggregate';
import type { FilterKind } from './filtering';

export type Align = 'left' | 'right';

interface ColBase {
  /** Field on the row to read for this column's value. */
  key: string;
  header: string;
  /** Computed value: derive this cell's value from the whole row instead of
      reading `row[key]` (KPIs, ratios, deltas). Flows through display, sort,
      filter, aggregation, export and conditional formatting. `key` still names
      the column (and is the sort/filter key) but need not be a real row field.
      Keep it cheap and pure — it's called during sort/filter. Computed columns
      aren't editable. In-memory mode (a server source owns its own derivations). */
  value?: (row: GridRow) => unknown;
  /** Fixed width in px. Ignored when `flex` is set. */
  width?: number;
  /** Min/max width (px) enforced while drag-resizing this column. */
  minWidth?: number;
  maxWidth?: number;
  /** flex-grow weight; column stretches to fill remaining space. */
  flex?: number;
  align?: Align;
  /** Extra class(es) for this column's data cells — a static string, or a
      function of the cell value/row for conditional styling. Target via
      `:global(.bo-grid .c.your-class)`. */
  cellClass?: string | ((value: unknown, row: GridRow) => string | undefined);
  /** Extra class(es) for this column's header. Target via `:global`. */
  headerClass?: string;
  /** Amber flash on value change (drives off the row's flashSeq/flashDir). */
  flash?: boolean;
  /** Set false to disable header-click sorting on this column. */
  sortable?: boolean;
  /** Custom ascending comparator for this column's values (e.g. enum priority or
      natural sort). Direction is applied by the grid. In-memory mode only. */
  compare?: (a: unknown, b: unknown) => number;
  /** When grouping is active, show this aggregate of the column on group headers. */
  groupAgg?: AggKind;
  /** Pin this column so it stays visible during horizontal scroll. `true` /
      `'left'` pins to the left edge, `'right'` to the right. */
  pinned?: boolean | 'left' | 'right';
  /** Allow inline editing (double-click or Enter on the focused cell). */
  editable?: boolean;
  /** Validate an edited value before it commits (inline edit or paste). Return
      false to reject and keep the old value. Receives the coerced value. */
  validate?: (value: string | number, row: GridRow) => boolean;
  /** Editable choices: when set, editing renders a `<select>` of these options
      instead of a text input (enum/status columns). */
  options?: string[];
  /** Set a native `title` tooltip on each cell (the full formatted value) — handy
      when content truncates. */
  tooltip?: boolean;
  /** Custom display formatter, overriding the built-in type formatter. Applies
      to display, tooltip, copy and (formatted) export. `row` is absent for
      aggregate cells. */
  format?: (value: unknown, row?: GridRow) => string;
  /** Set false to disable drag-to-resize on this column (default on). */
  resizable?: boolean;
  /** Parent header label. Consecutive columns sharing a `group` render under a
      spanning header. Best with fixed-width columns. */
  group?: string;
  /** Header filter-menu control for this column (requires `filterMenu` on
      <Grid>). Defaults to the column's type; `'set'` shows a value checklist;
      `false` disables filtering for this column. */
  filter?: false | FilterKind;
  /** Conditional formatting — a horizontal bar painted behind the cell value,
      scaled across the column's value range. The range is auto-computed over the
      current view (in-memory) unless `min`/`max` are given; pass `min: 0` for
      absolute proportional bars. Bars cross a zero baseline when the range spans
      negatives. Numeric columns only. */
  dataBar?: DataBarConfig;
  /** Conditional formatting — show an icon beside the value, chosen by the
      highest threshold `at` that is ≤ the cell value (e.g. ▲ ● ▼ by sign or band).
      Numeric columns only. */
  icons?: IconRule[];
  /** Conditional formatting — tint the cell background across the column's value
      range (a soft heat ramp). Auto-ranged over the current view unless `min`/
      `max` are given; pass `mid` for a 3-stop diverging scale (e.g. `mid: 0`).
      Numeric columns only. */
  colorScale?: ColorScaleConfig;
}

/** Conditional-formatting data-bar config (see `ColBase.dataBar`). */
export interface DataBarConfig {
  min?: number;
  max?: number;
  /** Bar colour for values ≥ 0 (default `--bo-up`). Any CSS colour or var. */
  color?: string;
  /** Bar colour for values < 0 (default `--bo-down`). */
  negative?: string;
}

/** Conditional-formatting colour-scale config (see `ColBase.colorScale`). */
export interface ColorScaleConfig {
  min?: number;
  /** Midpoint for a 3-stop diverging scale (e.g. `0`). Omit for a 2-stop scale. */
  mid?: number;
  max?: number;
  /** Stop colours — `[low, high]` (2-stop) or `[low, mid, high]` (3-stop). Any
      CSS colour or var. Defaults to a soft, translucent theme ramp (up tint for
      high; down→up diverging when `mid` is set). */
  colors?: [string, string] | [string, string, string];
}

/** A single icon-set threshold rule (see `ColBase.icons`). */
export interface IconRule {
  /** Lower bound: this rule wins when `value >= at` and `at` is the greatest
      such threshold. */
  at: number;
  icon: string;
  tone?: BadgeTone;
}

/** Resolved data-bar geometry as fractions of the cell width (0..1). */
export interface DataBarGeom {
  /** Distance of the bar's left edge from the cell's left edge. */
  left: number;
  /** Bar width. */
  width: number;
  /** The value is negative (use the bar's `negative` colour). */
  negative: boolean;
}

export interface CellEditEvent {
  row: GridRow;
  column: ColumnDef;
  /** Parsed value: a number for numeric columns, otherwise the raw string. */
  value: string | number;
}

/**
 * Discriminated column config — the public Phase 0 "columns + rows" surface,
 * extended with the Phase 1 sparkline + heatmap cell types.
 */
export type ColumnDef =
  | (ColBase & { type: 'text'; sub?: string })
  | (ColBase & { type: 'price' })
  | (ColBase & { type: 'percent' })
  | (ColBase & { type: 'volume' })
  | (ColBase & { type: 'number'; decimals?: number })
  | (ColBase & { type: 'date'; dateStyle?: DateStyle })
  | (ColBase & { type: 'currency'; currency?: string; locale?: string; decimals?: number })
  | (ColBase & { type: 'relative' }) // value: epoch ms → "3 hours ago"
  | (ColBase & { type: 'heatmap'; min: number; max: number; decimals?: number })
  | (ColBase & { type: 'sparkline'; sparkKey: string })
  // Rich cell types (any business domain) — value renders as the named widget.
  | (ColBase & { type: 'progress'; min?: number; max?: number })
  | (ColBase & { type: 'rating'; max?: number })
  | (ColBase & { type: 'tags' }) // value: string[] (or comma-separated string)
  | (ColBase & { type: 'badge'; tones?: Record<string, BadgeTone> })
  | (ColBase & { type: 'boolean'; trueLabel?: string; falseLabel?: string })
  | (ColBase & { type: 'avatar'; sub?: string }) // value: display name
  | (ColBase & { type: 'link'; href?: (row: GridRow) => string; newTab?: boolean }) // value: text
  // Rendered by the consumer's `cell` snippet on <Grid>.
  | (ColBase & { type: 'custom' });

/** Semantic colour for a `badge` value (mapped via the column's `tones`). */
export type BadgeTone = 'up' | 'down' | 'amber' | 'info' | 'neutral';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string;
  dir: SortDir;
}

/** Minimal row contract the grid relies on. Concrete rows add their own fields. */
export interface GridRow {
  id: number;
  flashSeq: number;
  flashDir: 'up' | 'down';
  [field: string]: unknown;
}

/**
 * The cell's value: a column's computed `value(row)` when defined, else the row
 * field `row[key]`. Route ALL value reads through this so computed columns flow
 * through display, sort, filter, aggregation and export.
 */
export function cellValue(col: ColumnDef, row: GridRow): unknown {
  return col.value ? col.value(row) : row[col.key];
}

export function formatCell(col: ColumnDef, value: unknown, row?: GridRow): string {
  if (col.format) return col.format(value, row);
  const n = typeof value === 'number' ? value : Number(value);
  switch (col.type) {
    case 'price':
      return fmtPrice(n);
    case 'percent':
      return fmtPercent(n);
    case 'volume':
      return fmtVolume(n);
    case 'number':
      return n.toFixed(col.decimals ?? 2);
    case 'date':
      return fmtDate(n, col.dateStyle);
    case 'currency':
      return fmtCurrency(n, col.currency, col.locale, col.decimals);
    case 'relative':
      return relativeTime(n);
    case 'heatmap':
      return n.toFixed(col.decimals ?? 2);
    case 'rating':
      return `${value ?? 0}`;
    case 'tags':
      return Array.isArray(value) ? value.join(', ') : String(value ?? '');
    case 'boolean':
      return value ? (col.trueLabel ?? 'Yes') : (col.falseLabel ?? 'No');
    default:
      // progress / badge / avatar / link / text and friends.
      return value == null ? '' : String(value);
  }
}

export function isSortable(col: ColumnDef): boolean {
  return col.type !== 'sparkline' && col.sortable !== false;
}

// Rich display widgets aren't text-editable (they render structured/visual data).
const DISPLAY_ONLY = ['sparkline', 'custom', 'tags', 'badge', 'boolean', 'avatar', 'progress', 'rating', 'link', 'relative'];

export function isEditable(col: ColumnDef): boolean {
  // Computed columns have no underlying field to write back to.
  return !!col.editable && !col.value && !DISPLAY_ONLY.includes(col.type);
}

function rawCompare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''));
}

export function compareRows(a: GridRow, b: GridRow, sort: SortState, col?: ColumnDef): number {
  // Computed columns sort by their derived value; everything else reads the
  // authoritative sort key off the row.
  const av = col?.value ? col.value(a) : a[sort.key];
  const bv = col?.value ? col.value(b) : b[sort.key];
  const d = col?.compare ? col.compare(av, bv) : rawCompare(av, bv);
  return sort.dir === 'asc' ? d : -d;
}

/**
 * Multi-key comparison: apply each sort in order, returning the first that
 * separates the rows. An empty list leaves rows in their original order.
 */
export function compareBySorts(
  a: GridRow,
  b: GridRow,
  sorts: readonly SortState[],
  colOf?: (key: string) => ColumnDef | undefined,
): number {
  for (const sort of sorts) {
    const d = compareRows(a, b, sort, colOf?.(sort.key));
    if (d !== 0) return d;
  }
  return 0;
}

export function colStyle(col: ColumnDef): string {
  if (col.flex) return `flex:${col.flex} 1 0;min-width:0;`;
  return `flex:0 0 ${col.width ?? 96}px;`;
}

/** Concrete pixel width for a column (flex columns get a sensible default). */
export function colWidth(col: ColumnDef): number {
  return col.flex ? (col.width ?? 160) : (col.width ?? 96);
}

export function isNumeric(col: ColumnDef): boolean {
  // Non-numeric (text-aligned / structured) types; everything else is a number.
  return !['text', 'sparkline', 'custom', 'tags', 'badge', 'boolean', 'avatar', 'link'].includes(col.type);
}

export function candlesOf(row: GridRow, key: string): Candle[] {
  return (row[key] as Candle[]) ?? [];
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Coerce to a number, but treat null/undefined/'' as non-numeric (NaN) — guards
// against `Number(null) === 0` slipping blanks through as a real zero value.
function numericOrNaN(value: unknown): number {
  if (value === null || value === undefined || value === '') return NaN;
  return typeof value === 'number' ? value : Number(value);
}

/**
 * Conditional formatting — data-bar geometry. Maps `value` onto a 0..1 range,
 * anchored at the zero baseline so signed columns diverge left/right around zero
 * (left-anchored when the range doesn't cross zero). `range` is the data extent;
 * `cfg.min`/`cfg.max` override it (e.g. `min: 0` for absolute bars). Returns null
 * for non-numeric values (no bar). Pure; unit-tested.
 */
export function dataBarGeometry(
  value: unknown,
  range: { min: number; max: number },
  cfg: { min?: number; max?: number } = {},
): DataBarGeom | null {
  const n = numericOrNaN(value);
  if (!Number.isFinite(n)) return null;
  const min = cfg.min ?? range.min;
  const max = cfg.max ?? range.max;
  const span = max - min || 1;
  const zero = clamp01((0 - min) / span);
  const v = clamp01((n - min) / span);
  return { left: Math.min(zero, v), width: Math.abs(v - zero), negative: n < 0 };
}

// Default colour-scale stops — soft, translucent theme tints so row striping
// shows through and text stays readable (mixed in sRGB to keep clean alpha).
const SCALE_SEQ: [string, string] = ['transparent', 'color-mix(in srgb, var(--bo-up) 32%, transparent)'];
const SCALE_DIV: [string, string, string] = [
  'color-mix(in srgb, var(--bo-down) 34%, transparent)',
  'transparent',
  'color-mix(in srgb, var(--bo-up) 34%, transparent)',
];

const mixColor = (a: string, b: string, t: number): string =>
  `color-mix(in srgb, ${b} ${(clamp01(t) * 100).toFixed(1)}%, ${a})`;

/**
 * Conditional formatting — colour-scale background for a value across the range.
 * Two-stop (low→high) by default; pass `cfg.mid` (or 3 `colors`) for a diverging
 * scale. `range` is the data extent; `cfg.min`/`cfg.max` override it. Returns null
 * for non-numeric values (no tint). Pure; unit-tested.
 */
export function colorScaleBackground(
  value: unknown,
  range: { min: number; max: number },
  cfg: ColorScaleConfig = {},
): string | null {
  const n = numericOrNaN(value);
  if (!Number.isFinite(n)) return null;
  const min = cfg.min ?? range.min;
  const max = cfg.max ?? range.max;
  const span = max - min || 1;
  const t = clamp01((n - min) / span);
  if (cfg.mid != null || cfg.colors?.length === 3) {
    const [lo, md, hi] = (cfg.colors as [string, string, string]) ?? SCALE_DIV;
    const mt = clamp01(((cfg.mid ?? (min + max) / 2) - min) / span);
    return t <= mt
      ? mixColor(lo, md, mt === 0 ? 1 : t / mt)
      : mixColor(md, hi, mt === 1 ? 1 : (t - mt) / (1 - mt));
  }
  const [lo, hi] = (cfg.colors as [string, string]) ?? SCALE_SEQ;
  return mixColor(lo, hi, t);
}

/**
 * Conditional formatting — pick the icon-set rule for a value: the rule with the
 * greatest `at` threshold that is ≤ the value (order-independent). Returns null
 * for non-numeric values or when no threshold matches. Pure; unit-tested.
 */
export function pickIcon(value: unknown, rules: readonly IconRule[]): IconRule | null {
  const n = numericOrNaN(value);
  if (!Number.isFinite(n)) return null;
  let pick: IconRule | null = null;
  for (const rule of rules) {
    if (n >= rule.at && (pick === null || rule.at >= pick.at)) pick = rule;
  }
  return pick;
}

/** Sanitize a `link` column's href: block the XSS-prone url schemes
    (javascript:/data:/vbscript:), pass everything else (http(s)/mailto/tel/
    relative). Returns undefined for an empty or unsafe href (renders as text). */
export function safeHref(url: string): string | undefined {
  const u = url.trim();
  if (!u) return undefined;
  // eslint-disable-next-line no-script-url
  if (/^(javascript|data|vbscript):/i.test(u)) return undefined;
  return u;
}

/** Semantic tone → grid theme colour var (shared by badges + icon sets). */
export function toneColor(tone?: BadgeTone): string {
  switch (tone) {
    case 'up':
      return 'var(--bo-up)';
    case 'down':
      return 'var(--bo-down)';
    case 'amber':
      return 'var(--bo-amber)';
    case 'info':
      return 'var(--bo-sel-border)';
    default:
      return 'var(--bo-text-dim)';
  }
}
