import type { ToneBands } from './bands';

export type { ToneBands };

/**
 * The APAC price-limit convention: colour by position relative to the daily
 * ceiling/floor/reference, not just up/down. A price pinned at the ceiling
 * (limit up) or floor (limit down) is a materially different signal from an
 * ordinary move and gets its own colour — the convention every VN/TH terminal
 * uses and no generic grid ships.
 */
export type Tone = 'ceiling' | 'floor' | 'ref' | 'up' | 'down';

const DEFAULT_EPSILON = 1e-6;

/**
 * Classify `value` against `bands`. `ceiling`/`floor` are optional — omit them
 * (or leave them `undefined`) to fall back to plain up/down/ref against `ref`
 * alone, e.g. for a market without a price-limit rule.
 *
 * `epsilon` absorbs float noise at the boundaries (a computed ceiling/floor
 * landing a fraction off due to prior rounding). Default is tight (1e-6) so it
 * only catches float drift, not "close to the edge" — widen it deliberately if
 * you want a "near the limit" visual cue instead of an exact-match one.
 *
 * Precondition (not validated — this is a hot pure function, not a boundary):
 * when both are given, `ceiling >= ref >= floor`. `vnBands` always satisfies
 * this. Hand-built bands that don't (mismatched ceiling/floor from different
 * instruments, a bad upstream computation) can misclassify, since the ceiling
 * check runs first and short-circuits — e.g. a `ceiling` below `ref` would
 * still win over the correct `'up'`/`'down'` answer for a value above it.
 */
export function resolveTone(value: number, bands: ToneBands, opts: { epsilon?: number } = {}): Tone {
  const eps = opts.epsilon ?? DEFAULT_EPSILON;
  if (bands.ceiling != null && value >= bands.ceiling - eps) return 'ceiling';
  if (bands.floor != null && value <= bands.floor + eps) return 'floor';
  if (Math.abs(value - bands.ref) <= eps) return 'ref';
  return value > bands.ref ? 'up' : 'down';
}

export interface ToneColors {
  ceiling: string;
  floor: string;
  ref: string;
  up: string;
  down: string;
}

/** The VN/TH terminal convention: purple ceiling, cyan floor, yellow reference,
    green up, red down. Override per deployment — these are a starting palette,
    not a standard. */
export const defaultToneColors: ToneColors = {
  ceiling: '#c026d3',
  floor: '#06b6d4',
  ref: '#eab308',
  up: '#16a34a',
  down: '#dc2626',
};

/** Resolve a tone to a CSS colour, with an optional partial override (only the
    tones you want to change from `defaultToneColors`). */
export function toneColor(tone: Tone, colors?: Partial<ToneColors>): string {
  return colors?.[tone] ?? defaultToneColors[tone];
}
