import { describe, it, expect, vi } from 'vitest';
import { TickBuffer, createTickStream, createRowIndex, applyPatches } from './ticks';

describe('TickBuffer', () => {
  it('coalesces repeated updates for one key into a single entry', () => {
    const b = new TickBuffer<string, { last: number }>();
    b.push('AAPL', { last: 1 });
    b.push('AAPL', { last: 2 });
    b.push('AAPL', { last: 3 });
    expect(b.size).toBe(1);
    expect(b.drain(10)).toEqual([['AAPL', { last: 3 }]]);
  });

  it('merges partial patches for one key instead of dropping fields', () => {
    const b = new TickBuffer<string, Record<string, number>>();
    b.push('AAPL', { bid: 10 });
    b.push('AAPL', { ask: 11 });
    expect(b.drain(10)).toEqual([['AAPL', { bid: 10, ask: 11 }]]);
  });

  it('lets a later field win over an earlier one for the same key', () => {
    const b = new TickBuffer<string, Record<string, number>>();
    b.push('AAPL', { last: 10, vol: 1 });
    b.push('AAPL', { last: 12 });
    expect(b.drain(10)).toEqual([['AAPL', { last: 12, vol: 1 }]]);
  });

  it('keeps distinct keys separate', () => {
    const b = new TickBuffer<string, { last: number }>();
    b.push('AAPL', { last: 1 });
    b.push('MSFT', { last: 2 });
    expect(b.size).toBe(2);
    expect(b.drain(10)).toEqual([
      ['AAPL', { last: 1 }],
      ['MSFT', { last: 2 }],
    ]);
  });

  it('drains at most cap entries and keeps the rest pending', () => {
    const b = new TickBuffer<number, { v: number }>();
    for (let i = 0; i < 10; i++) b.push(i, { v: i });
    expect(b.drain(4)).toHaveLength(4);
    expect(b.size).toBe(6);
  });

  it('drains in insertion order, so no key is starved by a busy one', () => {
    const b = new TickBuffer<number, { v: number }>();
    for (let i = 0; i < 6; i++) b.push(i, { v: i });
    b.push(0, { v: 99 }); // re-touching key 0 must not move it to the back
    expect(b.drain(3).map(([k]) => k)).toEqual([0, 1, 2]);
    expect(b.drain(3).map(([k]) => k)).toEqual([3, 4, 5]);
  });

  it('honours a custom merge strategy', () => {
    const b = new TickBuffer<string, number>({ merge: (prev, next) => prev + next });
    b.push('vol', 5);
    b.push('vol', 7);
    expect(b.drain(10)).toEqual([['vol', 12]]);
  });

  it('replaces rather than merges when patches are not plain objects', () => {
    const b = new TickBuffer<string, number>();
    b.push('last', 1);
    b.push('last', 2);
    expect(b.drain(10)).toEqual([['last', 2]]);
  });

  it('empties on clear', () => {
    const b = new TickBuffer<string, number>();
    b.push('a', 1);
    b.clear();
    expect(b.size).toBe(0);
    expect(b.drain(10)).toEqual([]);
  });
});

describe('createTickStream', () => {
  // A hand-driven scheduler stands in for requestAnimationFrame so frame
  // behaviour is deterministic and testable outside a browser.
  function manualScheduler() {
    const queue: Array<() => void> = [];
    return {
      schedule: (fn: () => void) => {
        queue.push(fn);
        return () => {
          const i = queue.indexOf(fn);
          if (i >= 0) queue.splice(i, 1);
        };
      },
      frame() {
        const due = queue.splice(0, queue.length);
        for (const fn of due) fn();
      },
      get pendingFrames() {
        return queue.length;
      },
    };
  }

  it('does not apply anything until a frame runs', () => {
    const apply = vi.fn();
    const s = manualScheduler();
    const stream = createTickStream({ apply, schedule: s.schedule });
    stream.start();
    stream.push('AAPL', { last: 1 });
    expect(apply).not.toHaveBeenCalled();
    s.frame();
    expect(apply).toHaveBeenCalledWith([['AAPL', { last: 1 }]]);
  });

  it('applies one coalesced batch per frame, however many ticks arrived', () => {
    const apply = vi.fn();
    const s = manualScheduler();
    const stream = createTickStream({ apply, schedule: s.schedule });
    stream.start();
    for (let i = 0; i < 1000; i++) stream.push('AAPL', { last: i });
    s.frame();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenCalledWith([['AAPL', { last: 999 }]]);
  });

  it('caps the work per frame and carries the remainder to the next frame', () => {
    const batches: number[] = [];
    const s = manualScheduler();
    const stream = createTickStream<number, { v: number }>({
      apply: (b) => batches.push(b.length),
      cap: 10,
      schedule: s.schedule,
    });
    stream.start();
    for (let i = 0; i < 25; i++) stream.push(i, { v: i });
    s.frame();
    s.frame();
    s.frame();
    expect(batches).toEqual([10, 10, 5]);
  });

  it('reports pending depth and applied count for a health indicator', () => {
    const s = manualScheduler();
    const stream = createTickStream<number, { v: number }>({
      apply: () => {},
      cap: 2,
      schedule: s.schedule,
    });
    stream.start();
    for (let i = 0; i < 5; i++) stream.push(i, { v: i });
    expect(stream.pending).toBe(5);
    s.frame();
    expect(stream.applied).toBe(2);
    expect(stream.pending).toBe(3);
  });

  it('skips calling apply on an idle frame', () => {
    const apply = vi.fn();
    const s = manualScheduler();
    const stream = createTickStream({ apply, schedule: s.schedule });
    stream.start();
    s.frame();
    expect(apply).not.toHaveBeenCalled();
  });

  it('keeps scheduling frames while running, and stops when stopped', () => {
    const s = manualScheduler();
    const stream = createTickStream({ apply: () => {}, schedule: s.schedule });
    stream.start();
    expect(s.pendingFrames).toBe(1);
    s.frame();
    expect(s.pendingFrames).toBe(1);
    stream.stop();
    s.frame();
    expect(s.pendingFrames).toBe(0);
  });

  it('buffers ticks pushed before start and applies them once started', () => {
    const apply = vi.fn();
    const s = manualScheduler();
    const stream = createTickStream({ apply, schedule: s.schedule });
    stream.push('AAPL', { last: 1 });
    stream.start();
    s.frame();
    expect(apply).toHaveBeenCalledWith([['AAPL', { last: 1 }]]);
  });

  it('keeps the frame loop alive and does not count a failed batch as applied when apply throws', () => {
    const s = manualScheduler();
    const errors: unknown[] = [];
    let calls = 0;
    const stream = createTickStream<number, { v: number }>({
      apply: () => {
        calls++;
        if (calls === 1) throw new Error('boom');
      },
      schedule: s.schedule,
      onError: (e) => errors.push(e),
    });
    stream.start();
    stream.push(1, { v: 1 });
    s.frame(); // apply throws on this frame
    expect(errors).toEqual([new Error('boom')]);
    expect(stream.applied).toBe(0);
    expect(s.pendingFrames).toBe(1); // loop is still scheduled for next frame

    stream.push(2, { v: 2 });
    s.frame(); // this frame's apply succeeds
    expect(calls).toBe(2);
    expect(stream.applied).toBe(1);
  });

  it('is idempotent on repeated start, so it cannot double-schedule', () => {
    const s = manualScheduler();
    const stream = createTickStream({ apply: () => {}, schedule: s.schedule });
    stream.start();
    stream.start();
    expect(s.pendingFrames).toBe(1);
  });

  it('drops pending ticks on stop when asked to', () => {
    const s = manualScheduler();
    const stream = createTickStream({ apply: () => {}, schedule: s.schedule });
    stream.start();
    stream.push('AAPL', { last: 1 });
    stream.stop({ discard: true });
    expect(stream.pending).toBe(0);
  });

  it('flushNow drains everything synchronously, ignoring the cap', () => {
    const apply = vi.fn();
    const s = manualScheduler();
    const stream = createTickStream<number, { v: number }>({ apply, cap: 2, schedule: s.schedule });
    for (let i = 0; i < 7; i++) stream.push(i, { v: i });
    stream.flushNow();
    expect(apply.mock.calls[0][0]).toHaveLength(7);
    expect(stream.pending).toBe(0);
  });
});

describe('createRowIndex / applyPatches', () => {
  const rows = [
    { id: 'AAPL', last: 100, vol: 1 },
    { id: 'MSFT', last: 200, vol: 2 },
  ];

  it('indexes rows by id for O(1) patch application', () => {
    const idx = createRowIndex(rows, (r) => r.id);
    expect(idx.get('MSFT')).toBe(rows[1]);
  });

  it('applies patches in place, touching only the patched fields', () => {
    const local = rows.map((r) => ({ ...r }));
    const idx = createRowIndex(local, (r) => r.id);
    applyPatches(idx, [['AAPL', { last: 105 }]]);
    expect(local[0]).toEqual({ id: 'AAPL', last: 105, vol: 1 });
  });

  it('returns how many patches found a row', () => {
    const local = rows.map((r) => ({ ...r }));
    const idx = createRowIndex(local, (r) => r.id);
    const n = applyPatches(idx, [
      ['AAPL', { last: 1 }],
      ['NOPE', { last: 2 }],
    ]);
    expect(n).toBe(1);
  });

  it('ignores a patch for an unknown id rather than throwing', () => {
    const idx = createRowIndex(rows, (r) => r.id);
    expect(() => applyPatches(idx, [['GONE', { last: 1 }]])).not.toThrow();
  });

  it('skips a field whose value is unchanged, so no spurious flash is triggered', () => {
    const row = { id: 'AAPL', last: 100, vol: 1 };
    let writes = 0;
    const tracked = new Proxy(row, {
      set(t, k, v) {
        writes++;
        return Reflect.set(t, k, v);
      },
    });
    applyPatches(new Map([['AAPL', tracked]]), [['AAPL', { last: 100, vol: 5 }]]);
    expect(writes).toBe(1);
  });
});
