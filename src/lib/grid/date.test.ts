import { describe, it, expect } from 'vitest';
import { dayStart, fromDateInput, toDateInput } from './date';

// Built from local-time constructors so the tests hold in any time zone.
describe('local calendar-day helpers', () => {
  it('dayStart floors to local midnight', () => {
    expect(dayStart(new Date(2024, 0, 15, 23, 59).getTime())).toBe(new Date(2024, 0, 15).getTime());
    expect(dayStart(new Date(2024, 0, 15, 0, 0).getTime())).toBe(new Date(2024, 0, 15).getTime());
  });

  it('toDateInput formats the local day as yyyy-mm-dd', () => {
    expect(toDateInput(new Date(2024, 0, 5, 23, 30).getTime())).toBe('2024-01-05');
    expect(toDateInput(new Date(2024, 11, 31, 0, 1).getTime())).toBe('2024-12-31');
    expect(toDateInput(NaN)).toBe('');
  });

  it('fromDateInput parses to local midnight', () => {
    expect(fromDateInput('2024-01-15')).toBe(new Date(2024, 0, 15).getTime());
    expect(fromDateInput('')).toBeNaN();
    expect(fromDateInput('not-a-date')).toBeNaN();
    expect(fromDateInput('2024-02-30')).toBeNaN();
  });

  it('round-trips a displayed day', () => {
    const ms = new Date(2024, 6, 4, 3, 15).getTime();
    expect(fromDateInput(toDateInput(ms))).toBe(dayStart(ms));
  });
});
