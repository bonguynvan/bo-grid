import type { Candle } from '../../lib/types';
import type { TickerSeed } from '../types';

const SECTORS = ['Tech', 'Energy', 'Finance', 'Health', 'Consumer', 'Industrial'];
const EXCHANGES = ['NYSE', 'NASDAQ'];
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Deterministic PRNG so reloads are comparable (no Math.random in hot paths).
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCandles(rng: () => number, start: number, count: number): Candle[] {
  const out: Candle[] = [];
  let prev = start;
  for (let i = 0; i < count; i++) {
    const open = prev;
    const drift = (rng() - 0.5) * open * 0.04;
    const close = Math.max(0.5, open + drift);
    const high = Math.max(open, close) + rng() * open * 0.015;
    const low = Math.min(open, close) - rng() * open * 0.015;
    const volume = Math.floor(rng() * 5_000_000) + 100_000;
    out.push({ open, high, low, close, volume });
    prev = close;
  }
  return out;
}

function symbolFor(rng: () => number): string {
  const len = 3 + Math.floor(rng() * 2);
  let s = '';
  for (let i = 0; i < len; i++) s += LETTERS[Math.floor(rng() * 26)];
  return s;
}

export function generateTickers(count: number): TickerSeed[] {
  const rng = mulberry32(0x9e3779b9);
  const rows: TickerSeed[] = [];
  for (let id = 0; id < count; id++) {
    const start = 10 + rng() * 490;
    const candles = makeCandles(rng, start, 24);
    const last = candles[candles.length - 1].close;
    // Listing date between 2000-01-01 and ~2023-12 (deterministic, no Date.now).
    const listedAt = Date.UTC(2000, 0, 1) + Math.floor(rng() * 24 * 365 * 86_400_000);
    rows.push({
      id,
      symbol: symbolFor(rng),
      name: `${symbolFor(rng)} Holdings`,
      sector: SECTORS[Math.floor(rng() * SECTORS.length)],
      exchange: EXCHANGES[Math.floor(rng() * EXCHANGES.length)],
      dayOpen: candles[0].open,
      price: last,
      listedAt,
      candles,
    });
  }
  return rows;
}
