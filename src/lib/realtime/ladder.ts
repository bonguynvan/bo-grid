// Centered-window math for a price ladder / DOM view.
//
// A ladder shows more price levels than fit on screen, kept centered on a
// point of interest (usually the spread) and re-centering as the market
// moves — "scroll-lock". Rather than fight virtual-scroll internals to
// physically scroll to a position, this computes which slice of your levels
// array to hand the grid: feed `rows.slice(start, end)` to `<Grid>` instead of
// the full book, and recompute the window each tick. Centering is then just
// array slicing — no scroll control needed, and it composes with everything
// else the grid already does (sort/filter would rarely apply to a ladder, but
// nothing here assumes otherwise).
//
// "Scroll-lock" itself (follow the market vs. hold position because the
// viewer scrolled away) is UI state, not math — keep a `lockedCenter: number |
// null` in your component: `null` follows the live center; a specific index
// (set when the viewer manually pages) freezes the window there until they
// re-lock.

export interface LadderWindow {
  start: number;
  end: number;
}

/**
 * The `[start, end)` slice of `visibleCount` contiguous indices out of
 * `[0, totalCount)`, centered on `centerIndex` and clamped to the array's
 * bounds so it never runs off either end (and never exceeds `totalCount`
 * itself, if `visibleCount` is larger than the array).
 *
 * An odd `visibleCount` splits evenly around the center (e.g. 11 → 5 below +
 * center + 5 above). An EVEN `visibleCount` can't split evenly — the extra row
 * goes on the lower-index side (e.g. 10 → 5 below + center + 4 above) — a
 * fixed, documented convention rather than an arbitrary choice a caller has to
 * guess at. That split only holds away from the edges: once the center is
 * close enough to 0 or `totalCount - 1` that the window would run off the
 * array, clamping takes over and the even/odd rule no longer determines where
 * the "extra" row lands.
 */
export function centeredWindow(totalCount: number, centerIndex: number, visibleCount: number): LadderWindow {
  // Non-finite or non-positive counts have no valid window — empty rather than
  // propagating NaN/negative bounds (a downstream `array.slice(NaN, NaN)` would
  // silently coerce to an empty slice anyway, but returning NaN here hides that
  // something went wrong upstream, and a negative `visibleCount` would otherwise
  // produce `end < start`).
  if (!Number.isFinite(totalCount) || totalCount <= 0) return { start: 0, end: 0 };
  if (!Number.isFinite(visibleCount) || visibleCount <= 0) return { start: 0, end: 0 };
  if (visibleCount >= totalCount) return { start: 0, end: totalCount };

  // A non-finite center falls back to 0 rather than propagating NaN; a
  // fractional one is rounded — the return type is index bounds, always integers.
  const safeCenter = Number.isFinite(centerIndex) ? Math.round(centerIndex) : 0;
  const center = Math.max(0, Math.min(totalCount - 1, safeCenter));
  const before = Math.ceil((visibleCount - 1) / 2);
  const after = Math.floor((visibleCount - 1) / 2);

  let start = center - before;
  let end = center + after + 1;

  if (start < 0) {
    end += -start;
    start = 0;
  } else if (end > totalCount) {
    start -= end - totalCount;
    end = totalCount;
  }
  return { start, end };
}
