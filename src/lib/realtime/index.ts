// Public API for `bo-grid/realtime` — everything between a market-data feed
// and the grid: coalesced price updates, a capped trade tape, and the
// windowing math for a centered/scroll-locked price ladder.
//
// A separate entry, like `bo-grid/charts`: it adds nothing to the grid core
// unless you import it, and it keeps its own size budget.
export {
  TickBuffer,
  createTickStream,
  createRowIndex,
  applyPatches,
  DEFAULT_CAP,
} from './ticks';
export type {
  TickStream,
  TickStreamOptions,
  TickBufferOptions,
  Scheduler,
  Cancel,
} from './ticks';

export { TradeTape } from './tape';

export { centeredWindow } from './ladder';
export type { LadderWindow } from './ladder';
