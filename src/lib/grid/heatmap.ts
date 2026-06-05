// Diverging background ramp for the heatmap column type
// (proposal Phase 1 §Heatmap column): red below mid, green above.

const MAX_ALPHA = 0.34;

export function heatColor(value: number, min: number, max: number): string {
  const span = max - min || 1;
  const t = Math.max(0, Math.min(1, (value - min) / span)); // 0..1
  const k = (t - 0.5) * 2; // -1 (cold) .. +1 (hot)
  const alpha = Math.min(MAX_ALPHA, Math.abs(k) * MAX_ALPHA).toFixed(3);
  return k < 0
    ? `rgba(248, 113, 113, ${alpha})` // --down
    : `rgba(52, 211, 153, ${alpha})`; // --up
}
