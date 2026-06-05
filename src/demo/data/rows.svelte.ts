import type { Candle } from '../../lib/types';
import type { TickerSeed } from '../types';

export type FlashDir = 'up' | 'down';

/**
 * One ticker row. Hot fields are individually reactive ($state) so a price tick
 * mutates exactly one cell's dependency graph — not the whole table. Static
 * identity fields stay plain to keep the object cheap.
 */
export class TickerRow {
  readonly id: number;
  readonly symbol: string;
  readonly name: string;
  readonly sector: string;
  readonly exchange: string;
  readonly dayOpen: number;
  readonly listedAt: number;

  price = $state(0);
  changePct = $state(0);
  volume = $state(0);
  candles = $state<Candle[]>([]);

  // Flash trigger: dir + a monotonically increasing seq the cell keys on to
  // re-fire its CSS animation even when the price lands on the same value.
  flashDir = $state<FlashDir>('up');
  flashSeq = $state(0);

  constructor(seed: TickerSeed) {
    this.id = seed.id;
    this.symbol = seed.symbol;
    this.name = seed.name;
    this.sector = seed.sector;
    this.exchange = seed.exchange;
    this.dayOpen = seed.dayOpen;
    this.listedAt = seed.listedAt;
    this.price = seed.price;
    this.volume = seed.candles[seed.candles.length - 1].volume;
    this.candles = seed.candles;
    this.recompute();
  }

  private recompute(): void {
    this.changePct = ((this.price - this.dayOpen) / this.dayOpen) * 100;
  }

  /** Apply a coalesced tick. Updates the live ("intraday") last candle in place. */
  applyTick(price: number, volume: number): void {
    this.flashDir = price >= this.price ? 'up' : 'down';
    this.price = price;
    this.volume = volume;
    this.recompute();
    this.flashSeq++;

    const last = this.candles[this.candles.length - 1];
    const updated: Candle = {
      open: last.open,
      high: Math.max(last.high, price),
      low: Math.min(last.low, price),
      close: price,
      volume,
    };
    // New array reference → sparkline $effect redraws (only if row is mounted).
    this.candles = [...this.candles.slice(0, -1), updated];
  }
}

export function buildRows(seeds: TickerSeed[]): TickerRow[] {
  return seeds.map((s) => new TickerRow(s));
}
