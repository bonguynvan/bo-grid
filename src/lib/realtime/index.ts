// Public API for `bo-grid/realtime` — the tick pipeline that sits between a
// market-data socket and the grid.
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
