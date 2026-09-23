import { describe, it, expect } from 'vitest';
import { TradeTape } from './tape';

describe('TradeTape', () => {
  it('starts empty', () => {
    const t = new TradeTape<number>(5);
    expect(t.size).toBe(0);
    expect(t.toArray()).toEqual([]);
  });

  it('returns trades NEWEST FIRST — the time & sales convention', () => {
    const t = new TradeTape<number>(5);
    t.push(1);
    t.push(2);
    t.push(3);
    expect(t.toArray()).toEqual([3, 2, 1]);
  });

  it('grows up to capacity', () => {
    const t = new TradeTape<number>(3);
    t.push(1);
    t.push(2);
    expect(t.size).toBe(2);
    t.push(3);
    expect(t.size).toBe(3);
  });

  it('drops the OLDEST trade once capacity is exceeded, keeping size at capacity', () => {
    const t = new TradeTape<number>(3);
    for (let i = 1; i <= 5; i++) t.push(i);
    expect(t.size).toBe(3);
    expect(t.toArray()).toEqual([5, 4, 3]); // 1 and 2 fell off the back
  });

  it('keeps correct order across many pushes beyond several capacity cycles', () => {
    const t = new TradeTape<number>(4);
    for (let i = 1; i <= 21; i++) t.push(i);
    expect(t.toArray()).toEqual([21, 20, 19, 18]);
  });

  it('exposes its capacity', () => {
    expect(new TradeTape(250).capacity).toBe(250);
  });

  it('works correctly at the minimum capacity of 1 (every push replaces the single slot)', () => {
    const t = new TradeTape<number>(1);
    t.push(1);
    t.push(2);
    t.push(3);
    expect(t.size).toBe(1);
    expect(t.toArray()).toEqual([3]);
  });

  it('throws rather than silently accepting a non-positive capacity', () => {
    expect(() => new TradeTape(0)).toThrow();
    expect(() => new TradeTape(-5)).toThrow();
  });

  it('defaults to a capacity of 500', () => {
    expect(new TradeTape().capacity).toBe(500);
  });

  it('clears all trades on clear()', () => {
    const t = new TradeTape<number>(5);
    t.push(1);
    t.push(2);
    t.clear();
    expect(t.size).toBe(0);
    expect(t.toArray()).toEqual([]);
  });

  it('works with an object trade shape, not just primitives', () => {
    interface Trade {
      price: number;
      side: 'buy' | 'sell';
    }
    const t = new TradeTape<Trade>(2);
    t.push({ price: 100, side: 'buy' });
    t.push({ price: 101, side: 'sell' });
    expect(t.toArray()).toEqual([
      { price: 101, side: 'sell' },
      { price: 100, side: 'buy' },
    ]);
  });

  it('toArray returns a fresh snapshot each call — mutating it does not affect the tape', () => {
    const t = new TradeTape<number>(5);
    t.push(1);
    const snap = t.toArray();
    snap.push(999);
    expect(t.toArray()).toEqual([1]);
  });
});
