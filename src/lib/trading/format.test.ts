import { describe, it, expect } from 'vitest';
import { decimalsForTick, fmtTradingPrice } from './format';

describe('decimalsForTick', () => {
  it('is 0 for a whole-number tick (e.g. VND)', () => {
    expect(decimalsForTick(10)).toBe(0);
    expect(decimalsForTick(100)).toBe(0);
    expect(decimalsForTick(1)).toBe(0);
  });

  it('matches the tick\'s own decimal places (e.g. a cent tick, an FX pip)', () => {
    expect(decimalsForTick(0.01)).toBe(2);
    expect(decimalsForTick(0.0001)).toBe(4);
  });

  it('handles a tick with trailing float imprecision (0.1 in IEEE-754)', () => {
    expect(decimalsForTick(0.1)).toBe(1);
  });

  it('handles a sub-pip tick that Number#toString renders in exponential notation', () => {
    // (0.0000001).toString() === '1e-7' — a naive string-split on "." would
    // silently see no decimal point and report 0.
    expect(decimalsForTick(0.0000001)).toBe(7);
    expect(decimalsForTick(0.00000001)).toBe(8); // an 8-decimal crypto tick
  });

  it('does not throw on a non-finite or absurdly large tick', () => {
    expect(decimalsForTick(NaN)).toBe(0);
    expect(decimalsForTick(Infinity)).toBe(0);
    expect(decimalsForTick(1e30)).toBe(0);
  });
});

describe('fmtTradingPrice', () => {
  it('formats a whole-VND price with no decimals and thousands separators', () => {
    expect(fmtTradingPrice(10_700, 50)).toBe('10,700');
  });

  it('formats a cent-tick price with 2 decimals', () => {
    expect(fmtTradingPrice(123.4, 0.01)).toBe('123.40');
  });

  it('formats a pip-tick FX price with 4 decimals', () => {
    expect(fmtTradingPrice(1.2345, 0.0001)).toBe('1.2345');
  });

  it('returns an empty string for a non-finite value', () => {
    expect(fmtTradingPrice(NaN, 50)).toBe('');
  });
});
