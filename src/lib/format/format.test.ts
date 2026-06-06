import { describe, it, expect } from 'vitest';
import { fmtPrice, fmtPercent, fmtVolume, fmtDate } from './format';

describe('fmtPrice', () => {
  it('always shows two fraction digits with thousands separators', () => {
    expect(fmtPrice(1234.5)).toBe('1,234.50');
    expect(fmtPrice(0)).toBe('0.00');
    expect(fmtPrice(1_000_000)).toBe('1,000,000.00');
  });

  it('rounds to two decimals and keeps the sign', () => {
    expect(fmtPrice(9.999)).toBe('10.00');
    expect(fmtPrice(-1234.5)).toBe('-1,234.50');
  });
});

describe('fmtPercent', () => {
  it('prefixes a + only for positive values', () => {
    expect(fmtPercent(1.5)).toBe('+1.50%');
    expect(fmtPercent(0)).toBe('0.00%');
    expect(fmtPercent(-2.345)).toBe('-2.35%');
  });
});

describe('fmtVolume', () => {
  it('passes through values below 1,000', () => {
    expect(fmtVolume(0)).toBe('0');
    expect(fmtVolume(999)).toBe('999');
  });

  it('abbreviates K / M / B at the right thresholds', () => {
    expect(fmtVolume(1_000)).toBe('1.0K');
    expect(fmtVolume(1_500)).toBe('1.5K');
    expect(fmtVolume(1_000_000)).toBe('1.00M');
    expect(fmtVolume(2_500_000)).toBe('2.50M');
    expect(fmtVolume(1_000_000_000)).toBe('1.00B');
  });
});

describe('fmtDate', () => {
  const ms = Date.UTC(2024, 0, 15, 12); // noon UTC avoids day-rollover by timezone

  it('returns an empty string for non-finite input', () => {
    expect(fmtDate(NaN)).toBe('');
    expect(fmtDate(Infinity)).toBe('');
  });

  it('formats medium style by default (Mon D, YYYY)', () => {
    expect(fmtDate(ms)).toBe(fmtDate(ms, 'medium'));
    expect(fmtDate(ms, 'medium')).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });

  it('formats short style as M/D/YY', () => {
    expect(fmtDate(ms, 'short')).toMatch(/^\d{1,2}\/\d{1,2}\/\d{2}$/);
  });
});
