// Public API for `bo-grid/trading` — market-convention helpers for APAC
// trading screens: price-limit tone (ceiling/floor/reference colouring),
// tick-aware price formatting, basis points and fractional prices (32nds),
// session state, positions from fills, and the FX and crypto conventions
// (pips and the FX week; round-the-clock sessions and significant-digit
// prices).
//
// A separate entry, like `bo-grid/realtime`: pure
// functions only, no Grid/Cell changes, so it adds nothing to the grid core
// unless imported, and none of this is baked into `ColumnDef` — wire it up via
// the existing `render`/`cell`/`cellClass`/`format` hooks (see the README).
export { vnTickSize, roundToTick, vnBandPercent, vnBands, vnFuturesBands, VN_FUTURES_TICK, VN_FUTURES_BAND } from './bands.js';
export type { Exchange, ToneBands } from './bands.js';

export { resolveTone, toneColor, defaultToneColors, darkToneColors, lightToneColors } from './tone.js';
export type { Tone, ToneColors } from './tone.js';

export { decimalsForTick, fmtTradingPrice, fmtBps, fmtFraction, parseFraction } from './format.js';
export type { BpsOptions, FractionOptions, FractionStyle } from './format.js';

export { sessionStateAt, sessionLabel, VN_HOSE_SCHEDULE } from './session.js';
export type { SessionState, SessionWindow, SessionOptions } from './session.js';

export { createPositions, unrealizedPnl } from './positions.js';
export type { Position, PositionBook, PositionFill } from './positions.js';

export { fxPipSize, fxQuoteParts, fxQuoteHtml, pipsBetween, fxMarketOpen, fxCentresOpen } from './fx.js';
export type { FxQuoteParts, FxCentre, PipOf } from './fx.js';

export { CRYPTO_SCHEDULE, fmtSigPrice } from './crypto.js';

// The errors this entry throws carry a stable `code` (BG3001…), the fix and a docs link.
export type { BoGridError, BoGridErrorCode } from '../errors.js';
