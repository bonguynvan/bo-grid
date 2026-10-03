import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createViewportSubscriptions } from './viewport';

type Row = { id: number; sym: string };
const rows = (...syms: string[]): Row[] => syms.map((sym, id) => ({ id, sym }));
const view = (...syms: string[]) => ({ first: 0, last: syms.length - 1, rows: rows(...syms) });

function setup(delay?: number) {
  const subscribed: string[][] = [];
  const unsubscribed: string[][] = [];
  const subs = createViewportSubscriptions<Row, string>({
    key: (r) => r.sym,
    subscribe: (keys) => subscribed.push([...keys].sort()),
    unsubscribe: (keys) => unsubscribed.push([...keys].sort()),
    delay,
  });
  return { subs, subscribed, unsubscribed };
}

describe('createViewportSubscriptions', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('subscribes the first view at once, with no wait', () => {
    const { subs, subscribed } = setup();
    subs.update(view('VNM', 'FPT', 'HPG'));
    expect(subscribed).toEqual([['FPT', 'HPG', 'VNM']]);
    expect([...subs.active].sort()).toEqual(['FPT', 'HPG', 'VNM']);
  });

  it('settles a fast scroll into one change after the delay', () => {
    const { subs, subscribed, unsubscribed } = setup(150);
    subs.update(view('A', 'B', 'C'));
    subs.update(view('B', 'C', 'D'));
    vi.advanceTimersByTime(100);
    subs.update(view('C', 'D', 'E'));
    vi.advanceTimersByTime(100);
    expect(subscribed).toHaveLength(1); // still settling
    vi.advanceTimersByTime(60);
    expect(subscribed).toEqual([['A', 'B', 'C'], ['D', 'E']]);
    expect(unsubscribed).toEqual([['A', 'B']]);
    expect([...subs.active].sort()).toEqual(['C', 'D', 'E']);
  });

  it('touches nothing when the visible set has not changed', () => {
    const { subs, subscribed, unsubscribed } = setup();
    subs.update(view('A', 'B'));
    subs.update(view('B', 'A')); // re-sorted, same symbols
    vi.runAllTimers();
    expect(subscribed).toHaveLength(1);
    expect(unsubscribed).toHaveLength(0);
  });

  it('collapses duplicate keys', () => {
    const { subs, subscribed } = setup();
    subs.update(view('A', 'A', 'B'));
    expect(subscribed).toEqual([['A', 'B']]);
  });

  it('flush applies a pending change now', () => {
    const { subs, subscribed, unsubscribed } = setup(500);
    subs.update(view('A'));
    subs.update(view('B'));
    subs.flush();
    expect(subscribed).toEqual([['A'], ['B']]);
    expect(unsubscribed).toEqual([['A']]);
    vi.runAllTimers();
    expect(subscribed).toHaveLength(2); // the timer it replaced does nothing
  });

  it('clear unsubscribes everything and drops a pending change', () => {
    const { subs, subscribed, unsubscribed } = setup();
    subs.update(view('A', 'B'));
    subs.update(view('C'));
    subs.clear();
    vi.runAllTimers();
    expect(subscribed).toEqual([['A', 'B']]);
    expect(unsubscribed).toEqual([['A', 'B']]);
    expect(subs.active.size).toBe(0);
  });

  it('starts over after clear: the next view subscribes at once again', () => {
    const { subs, subscribed } = setup();
    subs.update(view('A'));
    subs.clear();
    subs.update(view('B'));
    expect(subscribed).toEqual([['A'], ['B']]);
  });

  it('applies every change synchronously with delay 0', () => {
    const { subs, subscribed, unsubscribed } = setup(0);
    subs.update(view('A'));
    subs.update(view('B'));
    expect(subscribed).toEqual([['A'], ['B']]);
    expect(unsubscribed).toEqual([['A']]);
  });

  it('an empty view unsubscribes what was on screen', () => {
    const { subs, unsubscribed } = setup(0);
    subs.update(view('A', 'B'));
    subs.update({ first: -1, last: -1, rows: [] });
    expect(unsubscribed).toEqual([['A', 'B']]);
  });
});
