import { describe, it, expect } from 'vitest';
import { aggregate } from './aggregate';

describe('aggregate', () => {
  it('returns null for an empty list', () => {
    expect(aggregate([])).toBeNull();
  });

  it('computes sum, avg, count, min, max', () => {
    expect(aggregate([2, 4, 9])).toEqual({ sum: 15, avg: 5, count: 3, min: 2, max: 9 });
  });

  it('handles negatives and a single value', () => {
    expect(aggregate([-3])).toEqual({ sum: -3, avg: -3, count: 1, min: -3, max: -3 });
  });
});
