// Default categorical palette for multi-series charts (donut slices, grouped
// bars). Each entry is a CSS var with a fallback, so a consumer can re-theme the
// whole set by defining `--boc-1`…`--boc-6` on any ancestor — or pass `colors`.
export const CHART_PALETTE: readonly string[] = [
  'var(--boc-1, #6366f1)',
  'var(--boc-2, #10b981)',
  'var(--boc-3, #f59e0b)',
  'var(--boc-4, #ef4444)',
  'var(--boc-5, #06b6d4)',
  'var(--boc-6, #a855f7)',
];

/** A single-series default colour (line/bar). Override via `--boc-color` or the
    component's `color` prop. */
export const CHART_COLOR = 'var(--boc-color, #6366f1)';
