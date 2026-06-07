// Pure SVG geometry for the bo-grid/charts companion. No dependencies; every
// chart component is a thin SVG wrapper over these helpers, so the math is
// unit-tested in isolation and the components stay trivial.

export interface Point {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Arc {
  /** SVG path `d` for the slice. */
  d: string;
  value: number;
  index: number;
  /** Share of the (positive) total, 0..1. */
  fraction: number;
}

const round = (n: number): number => Math.round(n * 100) / 100;

/** Data extent, guarding empty/constant series. `baseline`, when given, is always
    included (e.g. 0 so bars share a zero axis). */
export function extent(values: readonly number[], baseline?: number): { min: number; max: number } {
  let min = baseline ?? Infinity;
  let max = baseline ?? -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min)) min = 0;
  if (!Number.isFinite(max)) max = min;
  if (min === max) max = min + 1; // avoid divide-by-zero on a flat series
  return { min, max };
}

/** Map a series to SVG points inside the [pad..w-pad] × [pad..h-pad] box (y down,
    so larger values sit higher). Pass an explicit `range` to share a scale. */
export function linePoints(
  values: readonly number[],
  w: number,
  h: number,
  pad = 1,
  range?: { min: number; max: number },
): Point[] {
  if (values.length === 0) return [];
  const { min, max } = range ?? extent(values);
  const span = max - min || 1;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const step = values.length > 1 ? iw / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: round(pad + i * step),
    y: round(pad + ih - ((v - min) / span) * ih),
  }));
}

/** SVG path `d` for a polyline through the points. */
export function linePath(points: readonly Point[]): string {
  return points.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join(' ');
}

/** SVG path `d` for the filled area under the polyline, down to `baselineY`. */
export function areaPath(points: readonly Point[], baselineY: number): string {
  if (points.length === 0) return '';
  const a = points[0];
  const b = points[points.length - 1];
  return `${linePath(points)} L${round(b.x)} ${round(baselineY)} L${round(a.x)} ${round(baselineY)} Z`;
}

/** Bar rectangles across the width, from a shared zero baseline (signed-aware:
    negatives extend below the axis). */
export function barRects(values: readonly number[], w: number, h: number, gap = 2, pad = 1): Rect[] {
  if (values.length === 0) return [];
  const { min, max } = extent(values, 0);
  const span = max - min || 1;
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const bw = Math.max(0, (iw - gap * (values.length - 1)) / values.length);
  const yOf = (v: number): number => pad + ih - ((v - min) / span) * ih;
  const zeroY = yOf(0);
  return values.map((v, i) => {
    const vy = yOf(Number.isFinite(v) ? v : 0);
    return { x: round(pad + i * (bw + gap)), y: round(Math.min(vy, zeroY)), w: round(bw), h: round(Math.abs(vy - zeroY)) };
  });
}

const polar = (cx: number, cy: number, r: number, a: number): [number, number] => [
  round(cx + r * Math.cos(a)),
  round(cy + r * Math.sin(a)),
];

/** One donut slice (outer arc out, radial in, inner arc back). */
function ringArc(cx: number, cy: number, r: number, ir: number, a0: number, a1: number): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const [xi1, yi1] = polar(cx, cy, ir, a1);
  const [xi0, yi0] = polar(cx, cy, ir, a0);
  return `M${x0} ${y0} A${round(r)} ${round(r)} 0 ${large} 1 ${x1} ${y1} L${xi1} ${yi1} A${round(ir)} ${round(ir)} 0 ${large} 0 ${xi0} ${yi0} Z`;
}

/** A complete ring (used when one slice is 100% — a single 360° arc degenerates).
    Outer circle CW + inner circle CCW; render with `fill-rule="evenodd"`. */
function fullRing(cx: number, cy: number, r: number, ir: number): string {
  return (
    `M${round(cx - r)} ${round(cy)} A${round(r)} ${round(r)} 0 1 1 ${round(cx + r)} ${round(cy)} ` +
    `A${round(r)} ${round(r)} 0 1 1 ${round(cx - r)} ${round(cy)} Z ` +
    `M${round(cx - ir)} ${round(cy)} A${round(ir)} ${round(ir)} 0 1 0 ${round(cx + ir)} ${round(cy)} ` +
    `A${round(ir)} ${round(ir)} 0 1 0 ${round(cx - ir)} ${round(cy)} Z`
  );
}

/** One bar segment of a multi-series (stacked/grouped) chart. */
export interface BarSeg extends Rect {
  series: number;
  category: number;
  value: number;
}

const nCategories = (series: readonly (readonly number[])[]): number =>
  series.reduce((m, s) => Math.max(m, s.length), 0);

/**
 * Stacked bars: `series[s][c]` is series `s`'s value in category `c`. Each
 * category is a vertical stack scaled to the largest category total. Non-positive
 * values are clamped to 0 (stacking).
 */
export function stackedBars(
  series: readonly (readonly number[])[],
  w: number,
  h: number,
  gap = 2,
  pad = 1,
): BarSeg[] {
  const nCat = nCategories(series);
  if (nCat === 0) return [];
  const totals = Array.from({ length: nCat }, (_, c) =>
    series.reduce((a, s) => a + Math.max(0, s[c] ?? 0), 0),
  );
  const max = Math.max(1, ...totals);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const bw = Math.max(0, (iw - gap * (nCat - 1)) / nCat);
  const segs: BarSeg[] = [];
  for (let c = 0; c < nCat; c++) {
    const x = pad + c * (bw + gap);
    let yBottom = pad + ih;
    for (let s = 0; s < series.length; s++) {
      const v = Math.max(0, series[s][c] ?? 0);
      const segH = (v / max) * ih;
      yBottom -= segH;
      segs.push({ x: round(x), y: round(yBottom), w: round(bw), h: round(segH), series: s, category: c, value: series[s][c] ?? 0 });
    }
  }
  return segs;
}

/**
 * Grouped bars: same data shape as `stackedBars`, but each category's series are
 * drawn side by side, scaled to the largest single value.
 */
export function groupedBars(
  series: readonly (readonly number[])[],
  w: number,
  h: number,
  gap = 4,
  innerGap = 1,
  pad = 1,
): BarSeg[] {
  const nCat = nCategories(series);
  const nSer = series.length;
  if (nCat === 0) return [];
  let max = 1;
  for (const s of series) for (const v of s) max = Math.max(max, v);
  const iw = w - pad * 2;
  const ih = h - pad * 2;
  const groupW = (iw - gap * (nCat - 1)) / nCat;
  const bw = Math.max(0, (groupW - innerGap * (nSer - 1)) / nSer);
  const segs: BarSeg[] = [];
  for (let c = 0; c < nCat; c++) {
    const gx = pad + c * (groupW + gap);
    for (let s = 0; s < nSer; s++) {
      const v = Math.max(0, series[s][c] ?? 0);
      const segH = (v / max) * ih;
      segs.push({ x: round(gx + s * (bw + innerGap)), y: round(pad + ih - segH), w: round(bw), h: round(segH), series: s, category: c, value: series[s][c] ?? 0 });
    }
  }
  return segs;
}

/** Donut/pie arc paths. `thickness >= size/2` gives a full pie. Slices start at
    12 o'clock and run clockwise; non-positive values are skipped. */
export function donutArcs(values: readonly number[], size: number, thickness: number): Arc[] {
  const pos = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = pos.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  const r = size / 2;
  const ir = Math.max(0, r - thickness);
  const cx = r;
  const cy = r;
  let a0 = -Math.PI / 2;
  const arcs: Arc[] = [];
  pos.forEach((v, index) => {
    if (v <= 0) return;
    const fraction = v / total;
    const a1 = a0 + fraction * Math.PI * 2;
    arcs.push({
      d: fraction >= 1 ? fullRing(cx, cy, r, ir) : ringArc(cx, cy, r, ir, a0, a1),
      value: values[index],
      index,
      fraction,
    });
    a0 = a1;
  });
  return arcs;
}
