export type AggKind = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface AggResult {
  sum: number;
  avg: number;
  count: number;
  min: number;
  max: number;
}

/** Aggregate a list of numbers. Returns null for an empty list. */
export function aggregate(values: number[]): AggResult | null {
  if (values.length === 0) return null;
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    sum += v;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { sum, avg: sum / values.length, count: values.length, min, max };
}

export const AGG_LABELS: Record<AggKind, string> = {
  sum: 'Sum',
  avg: 'Avg',
  count: 'Count',
  min: 'Min',
  max: 'Max',
};
