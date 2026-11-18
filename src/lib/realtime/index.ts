// Public API for `bo-grid/realtime` — everything between a market-data feed
// and the grid: coalesced price updates, a feed decoded in a worker and
// applied a batch a frame, an order book kept from a depth feed, a capped trade tape, rows that stay a moment after they leave a list,
// alerts that stay lit until acknowledged, and the windowing math for a
// centered/scroll-locked price ladder.
//
// A separate entry: it adds nothing to the grid core unless you import it,
// and it keeps its own size budget.
export {
  TickBuffer,
  createTickStream,
  createRowIndex,
  applyPatches,
  DEFAULT_CAP,
} from './ticks.js';
export type {
  TickStream,
  TickStreamOptions,
  TickBufferOptions,
  Scheduler,
  Cancel,
} from './ticks.js';

export { serveFeed, connectFeed } from './worker-feed.js';
export type { FeedSource, WorkerFeed, ServeFeedOptions, ConnectFeedOptions, FeedWorker, FeedScope } from './worker-feed.js';

export { createOrderBook } from './book.js';
export type { OrderBook, OrderBookOptions, OrderBookUpdate, BookUpdateResult, BookReadOptions, BookTop, BookRow, BookPairRow, BookLevel, BookLevelInput } from './book.js';

export { TradeTape } from './tape.js';

export { createViewportSubscriptions, DEFAULT_VIEWPORT_DELAY } from './viewport.js';
export type { ViewportSubscriptions, ViewportSubscriptionsOptions } from './viewport.js';

export { createLinger } from './linger.js';
export type { Linger, LingerOptions } from './linger.js';

export { createAlerts } from './alerts.js';
export type { Alerts, AlertsOptions, Alert, CheckOptions } from './alerts.js';

export { centeredWindow } from './ladder.js';
export type { LadderWindow } from './ladder.js';

// The errors this entry throws carry a stable `code` (BG2001…), the fix and a docs link.
export type { BoGridError, BoGridErrorCode } from '../errors.js';
