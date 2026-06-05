import { describe, it, expect } from 'vitest';
import { moveIndex } from './reorder';

describe('moveIndex', () => {
  it('moves an item forward', () => {
    expect(moveIndex([0, 1, 2, 3], 0, 2)).toEqual([1, 2, 0, 3]);
  });

  it('moves an item backward', () => {
    expect(moveIndex([0, 1, 2, 3], 3, 1)).toEqual([0, 3, 1, 2]);
  });

  it('returns a copy unchanged for no-op or out-of-range moves', () => {
    expect(moveIndex([0, 1, 2], 1, 1)).toEqual([0, 1, 2]);
    expect(moveIndex([0, 1, 2], -1, 0)).toEqual([0, 1, 2]);
    expect(moveIndex([0, 1, 2], 0, 9)).toEqual([0, 1, 2]);
  });

  it('does not mutate the input', () => {
    const src = [0, 1, 2];
    moveIndex(src, 0, 2);
    expect(src).toEqual([0, 1, 2]);
  });
});
