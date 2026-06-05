import type { Candle } from '../lib/types';

// Demo-only seed shape for the simulated ticker feed.
export interface TickerSeed {
  id: number;
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  dayOpen: number;
  price: number;
  listedAt: number;
  candles: Candle[];
}
