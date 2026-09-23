import { describe, it, expect } from 'vitest';
import { sessionStateAt, sessionLabel, VN_HOSE_SCHEDULE } from './session';

// 2024-01-08 is a Monday (Jan 1 2024 was a Monday); 2024-01-06 is the
// preceding Saturday. Using calendar-verifiable dates instead of hardcoding
// "today" keeps the test deterministic regardless of when it runs.
// Asia/Ho_Chi_Minh is UTC+7 with no DST, so ICT HH:mm = UTC (HH-7):mm.
function ict(hh: number, mm: number, day = 8): Date {
  return new Date(Date.UTC(2024, 0, day, hh - 7, mm));
}

describe('sessionStateAt (VN_HOSE_SCHEDULE)', () => {
  it('is "pre-open" before the market opens', () => {
    expect(sessionStateAt(ict(8, 30), VN_HOSE_SCHEDULE)).toBe('pre-open');
  });

  it('is "ato" during the opening call auction (09:00–09:15)', () => {
    expect(sessionStateAt(ict(9, 5), VN_HOSE_SCHEDULE)).toBe('ato');
  });

  it('is "continuous" during the morning session', () => {
    expect(sessionStateAt(ict(10, 0), VN_HOSE_SCHEDULE)).toBe('continuous');
  });

  it('is "break" over the lunch recess (11:30–13:00)', () => {
    expect(sessionStateAt(ict(12, 0), VN_HOSE_SCHEDULE)).toBe('break');
  });

  it('is "continuous" during the afternoon session', () => {
    expect(sessionStateAt(ict(14, 0), VN_HOSE_SCHEDULE)).toBe('continuous');
  });

  it('is "atc" during the closing call auction (14:30–14:45)', () => {
    expect(sessionStateAt(ict(14, 35), VN_HOSE_SCHEDULE)).toBe('atc');
  });

  it('is "closed" after the market closes', () => {
    expect(sessionStateAt(ict(15, 0), VN_HOSE_SCHEDULE)).toBe('closed');
    expect(sessionStateAt(ict(20, 0), VN_HOSE_SCHEDULE)).toBe('closed');
  });

  it('treats window boundaries as [start, end) — 09:15 is continuous, not ato', () => {
    expect(sessionStateAt(ict(9, 15), VN_HOSE_SCHEDULE)).toBe('continuous');
    expect(sessionStateAt(ict(9, 14), VN_HOSE_SCHEDULE)).toBe('ato');
  });

  it('is "closed" on a weekend regardless of time of day', () => {
    expect(sessionStateAt(ict(10, 0, 6), VN_HOSE_SCHEDULE)).toBe('closed');
  });

  it('does not special-case weekends when skipWeekends is false', () => {
    expect(sessionStateAt(ict(10, 0, 6), VN_HOSE_SCHEDULE, { skipWeekends: false })).toBe(
      'continuous',
    );
  });

  it('evaluates the schedule in the given IANA time zone regardless of host TZ', () => {
    // Same instant, asked in a different zone, should land in a different window.
    // ICT 09:05 (ato) is 2024-01-08T02:05:00Z, which is 21:05 the PREVIOUS
    // (Sunday) day in America/New_York (UTC-5 in January) — the post-close window.
    const instant = ict(9, 5);
    expect(sessionStateAt(instant, VN_HOSE_SCHEDULE, { timeZone: 'Asia/Ho_Chi_Minh' })).toBe('ato');
    expect(sessionStateAt(instant, VN_HOSE_SCHEDULE, { timeZone: 'America/New_York' })).toBe(
      'closed',
    );
  });
});

describe('sessionLabel', () => {
  it('has a short label for every state', () => {
    const states = ['pre-open', 'ato', 'continuous', 'break', 'atc', 'closed'] as const;
    for (const s of states) expect(sessionLabel(s).length).toBeGreaterThan(0);
  });
});
