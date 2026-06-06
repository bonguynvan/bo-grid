import { describe, it, expect } from 'vitest';
import { heatColor } from './heatmap';

describe('heatColor', () => {
  it('is fully red (max alpha) at the minimum', () => {
    expect(heatColor(0, 0, 100)).toBe('rgba(248, 113, 113, 0.340)');
  });

  it('is fully green (max alpha) at the maximum', () => {
    expect(heatColor(100, 0, 100)).toBe('rgba(52, 211, 153, 0.340)');
  });

  it('is transparent green at the midpoint', () => {
    expect(heatColor(50, 0, 100)).toBe('rgba(52, 211, 153, 0.000)');
  });

  it('scales alpha with distance from the midpoint', () => {
    // a quarter below mid → k = -0.5 → alpha = 0.5 * 0.34 = 0.170
    expect(heatColor(25, 0, 100)).toBe('rgba(248, 113, 113, 0.170)');
    // a quarter above mid → k = +0.5 → green at the same alpha
    expect(heatColor(75, 0, 100)).toBe('rgba(52, 211, 153, 0.170)');
  });

  it('clamps values outside [min, max]', () => {
    expect(heatColor(-50, 0, 100)).toBe('rgba(248, 113, 113, 0.340)');
    expect(heatColor(150, 0, 100)).toBe('rgba(52, 211, 153, 0.340)');
  });

  it('does not divide by zero for a degenerate range', () => {
    // span falls back to 1; value === min → t = 0 → cold
    expect(heatColor(5, 5, 5)).toBe('rgba(248, 113, 113, 0.340)');
  });
});
