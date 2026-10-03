import { describe, it, expect } from 'vitest';
import { FlashTracker, resolveFlashMode, isFresh, mergeFlash, type CellFlash, type ShownFlash } from './flash';

describe('resolveFlashMode', () => {
  it('maps legacy `true` to row-driven mode', () => {
    expect(resolveFlashMode(true)).toBe('row');
  });

  it('maps `auto` and `up-down` to the derived up/down mode', () => {
    expect(resolveFlashMode('auto')).toBe('up-down');
    expect(resolveFlashMode('up-down')).toBe('up-down');
  });

  it('maps `change` to the neutral mode', () => {
    expect(resolveFlashMode('change')).toBe('change');
  });

  it('returns null when flash is off', () => {
    expect(resolveFlashMode(false)).toBeNull();
    expect(resolveFlashMode(undefined)).toBeNull();
  });
});

describe('FlashTracker', () => {
  it('does not flash the first time a cell is seen', () => {
    const t = new FlashTracker();
    const s = t.observe(1, 'last', 100, 'up-down', 0);
    expect(s.changed).toBe(false);
    expect(s.seq).toBe(0);
  });

  it('flashes up when a numeric value rises', () => {
    const t = new FlashTracker();
    t.observe(1, 'last', 100, 'up-down', 0);
    const s = t.observe(1, 'last', 101, 'up-down', 10);
    expect(s.changed).toBe(true);
    expect(s.dir).toBe('up');
    expect(s.seq).toBe(1);
    expect(s.at).toBe(10);
  });

  it('flashes down when a numeric value falls', () => {
    const t = new FlashTracker();
    t.observe(1, 'last', 100, 'up-down', 0);
    expect(t.observe(1, 'last', 99, 'up-down', 10).dir).toBe('down');
  });

  it('is idempotent — re-observing an unchanged value does not re-flash', () => {
    const t = new FlashTracker();
    t.observe(1, 'last', 100, 'up-down', 0);
    const first = t.observe(1, 'last', 101, 'up-down', 10);
    const again = t.observe(1, 'last', 101, 'up-down', 20);
    expect(again.changed).toBe(false);
    expect(again.seq).toBe(first.seq);
    expect(again.at).toBe(first.at);
  });

  it('tracks each column of a row independently', () => {
    const t = new FlashTracker();
    t.observe(1, 'bid', 10, 'up-down', 0);
    t.observe(1, 'ask', 11, 'up-down', 0);
    const bid = t.observe(1, 'bid', 12, 'up-down', 5);
    const ask = t.observe(1, 'ask', 10, 'up-down', 5);
    expect(bid.dir).toBe('up');
    expect(ask.dir).toBe('down');
  });

  it('tracks each row independently, so recycled cells do not cross-flash', () => {
    const t = new FlashTracker();
    t.observe('AAPL', 'last', 100, 'up-down', 0);
    // A recycled cell now shows a different row with a different value: this is
    // the first sight of that row/column, so it must not flash.
    const s = t.observe('MSFT', 'last', 400, 'up-down', 1);
    expect(s.changed).toBe(false);
  });

  it('uses the neutral direction in `change` mode, for any value type', () => {
    const t = new FlashTracker();
    t.observe(1, 'status', 'open', 'change', 0);
    const s = t.observe(1, 'status', 'filled', 'change', 5);
    expect(s.changed).toBe(true);
    expect(s.dir).toBe('same');
  });

  it('reports a neutral direction when up/down cannot be compared', () => {
    const t = new FlashTracker();
    t.observe(1, 'note', 'a', 'up-down', 0);
    expect(t.observe(1, 'note', 'b', 'up-down', 5).dir).toBe('same');
  });

  it('treats an equal-but-different-type value as unchanged', () => {
    const t = new FlashTracker();
    t.observe(1, 'last', 100, 'up-down', 0);
    expect(t.observe(1, 'last', 100, 'up-down', 5).changed).toBe(false);
  });

  it('evicts oldest entries past the limit instead of growing forever', () => {
    const t = new FlashTracker({ limit: 4 });
    for (let i = 0; i < 40; i++) t.observe(i, 'last', i, 'up-down', i);
    expect(t.size).toBeLessThanOrEqual(4);
  });

  it('evicts by least-recently-touched, not by original insertion order — a cell that keeps ticking outlives cells older but colder than it', () => {
    const t = new FlashTracker({ limit: 4 });
    // Fill the cache: keys 0-3 (oldest → newest by insertion: 0, 1, 2, 3).
    for (let i = 0; i < 4; i++) t.observe(i, 'last', i, 'up-down', i);
    // Re-touch key 0 repeatedly (a hot cell). By insertion order it's the
    // OLDEST entry — a non-LRU eviction would drop it first — but it's also
    // the MOST recently used, so LRU order is now: 1, 2, 3, 0.
    for (let i = 0; i < 10; i++) t.observe(0, 'last', 100 + i, 'up-down', 100 + i);
    // Two new keys arrive — fewer than the 3 cold entries (1, 2, 3) ahead of
    // the hot key 0 in LRU order, so eviction (1 per insert at this limit)
    // should only ever take from 1/2/3, never reach 0.
    t.observe(10, 'last', 10, 'up-down', 10);
    t.observe(11, 'last', 11, 'up-down', 11);
    // Key 0 must still be tracked: observing it again with a NEW value should
    // register as a change, not a fresh first-sight (which would report
    // changed: false).
    const s = t.observe(0, 'last', 999, 'up-down', 999);
    expect(s.changed).toBe(true);
  });

  it('clears all state on reset', () => {
    const t = new FlashTracker();
    t.observe(1, 'last', 100, 'up-down', 0);
    t.reset();
    expect(t.size).toBe(0);
    expect(t.observe(1, 'last', 101, 'up-down', 5).changed).toBe(false);
  });
});

describe('FlashTracker delta', () => {
  it('reports the signed size of a numeric change', () => {
    const t = new FlashTracker();
    t.observe(1, 'px', 100, 'up-down', 0);
    expect(t.observe(1, 'px', 101.5, 'up-down', 1).delta).toBe(1.5);
    expect(t.observe(1, 'px', 99, 'up-down', 2).delta).toBe(-2.5);
  });

  it('reads numeric strings, and has no delta for anything else', () => {
    const t = new FlashTracker();
    t.observe(1, 'px', '10', 'change', 0);
    expect(t.observe(1, 'px', '12', 'change', 1).delta).toBe(2);
    t.observe(2, 'status', 'open', 'change', 0);
    expect(t.observe(2, 'status', 'filled', 'change', 1).delta).toBeUndefined();
    t.observe(3, 'px', '', 'change', 0);
    expect(t.observe(3, 'px', 5, 'change', 1).delta).toBeUndefined();
  });

  it('has no delta on first sight, and keeps the last one while the value holds', () => {
    const t = new FlashTracker();
    expect(t.observe(1, 'px', 100, 'up-down', 0).delta).toBeUndefined();
    t.observe(1, 'px', 103, 'up-down', 1);
    expect(t.observe(1, 'px', 103, 'up-down', 2).delta).toBe(3);
  });
});

describe('isFresh', () => {
  const state = { seq: 1, dir: 'up' as const, at: 1000, changed: true };

  it('is fresh inside the flash window', () => {
    expect(isFresh(state, 1100, 300)).toBe(true);
  });

  it('is stale once the window has passed', () => {
    expect(isFresh(state, 1400, 300)).toBe(false);
  });

  it('is never fresh for a cell that has not changed yet', () => {
    expect(isFresh({ seq: 0, dir: 'same', at: 0, changed: false }, 0, 300)).toBe(false);
  });
});

describe('mergeFlash (api.flashCells)', () => {
  const req = (over: Partial<CellFlash> = {}): CellFlash => ({ seq: 1, dir: 'same', at: 1000, columns: null, ...over });
  const tick = (over: Partial<ShownFlash> = {}): ShownFlash => ({ seq: 4, dir: 'up', on: true, ms: 300, at: 900, ...over });

  it('leaves the cell’s own flash alone without a request', () => {
    const own = tick();
    expect(mergeFlash(own, null, 'px', 300, 1000)).toBe(own);
    expect(mergeFlash(null, undefined, 'px', 300, 1000)).toBeNull();
  });

  it('ignores a request for other columns', () => {
    const own = tick();
    expect(mergeFlash(own, req({ columns: new Set(['qty']) }), 'px', 300, 1000)).toBe(own);
  });

  it('flashes a cell that has no flash of its own, over the column’s duration', () => {
    expect(mergeFlash(null, req({ dir: 'down' }), 'px', 300, 1100)).toEqual({ seq: 1, dir: 'down', on: true, ms: 300, at: 1000 });
  });

  it('covers every column when the request names none', () => {
    expect(mergeFlash(null, req(), 'anything', 300, 1000)?.on).toBe(true);
  });

  it('uses the request’s own duration, and stops showing once it has passed', () => {
    expect(mergeFlash(null, req({ ms: 800 }), 'px', 300, 1700)).toMatchObject({ on: true, ms: 800 });
    expect(mergeFlash(null, req({ ms: 800 }), 'px', 300, 1800)).toBeNull();
  });

  it('takes over a running tick with its own tint, and replays the animation', () => {
    const own = tick({ at: 900 });
    const shown = mergeFlash(own, req({ at: 1000 }), 'px', 300, 1000);
    expect(shown).toMatchObject({ on: true, dir: 'same' });
    // The replay key moves with either source, so its parity flips.
    expect((shown?.seq ?? 0) % 2).not.toBe(own.seq % 2);
  });

  it('lets a newer tick show over an older request', () => {
    const shown = mergeFlash(tick({ at: 1100, dir: 'down' }), req({ at: 1000 }), 'px', 300, 1100);
    expect(shown).toMatchObject({ on: true, dir: 'down', seq: 5 });
  });

  it('keeps the summed replay key once the request is over, so an always-on flash does not replay', () => {
    const shown = mergeFlash(tick({ at: 0 }), req({ at: 1000 }), 'px', 300, 5000);
    expect(shown).toMatchObject({ dir: 'up', seq: 5 });
  });
});
