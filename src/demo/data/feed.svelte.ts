import { createTickStream, type TickStream } from '../../lib/realtime';
import type { TickerRow } from './rows.svelte';

interface PendingTick {
  price: number;
  volume: number;
}

/**
 * Simulated realtime feed (stands in for a websocket).
 *
 * The coalesce-then-drain machinery isn't hand-rolled here any more — it's
 * `bo-grid/realtime`'s `createTickStream`, which is exactly what you'd wire a
 * real socket into:
 *
 *   socket.onmessage = (e) => stream.push(symbol, quote);
 *
 * Raw ticks land in the stream's buffer (cheap, no reactive writes, last-write
 * wins per row); once per animation frame at most `cap` of them are applied to
 * `$state`, which bounds reactive work per frame so a burst of 10k ticks can't
 * blow the frame budget. Off-screen rows still update their state; the virtual
 * list simply doesn't mount them, so no DOM work happens until they scroll in.
 */
export class Feed {
  private readonly rows: TickerRow[];
  private readonly stream: TickStream<number, PendingTick>;
  private readonly ingestPerTick: number;

  private rngState = 0x1234_5678;
  private ingestTimer: ReturnType<typeof setInterval> | null = null;

  // Live metrics for the demo status bar, mirrored out of the stream each frame.
  applied = $state(0);
  pendingDepth = $state(0);
  /** Rolling ticks-per-second actually applied to the grid — the throughput
      number that matters, sampled over a 1s window. */
  appliedPerSec = $state(0);

  private windowStart = 0;
  private windowBase = 0;

  constructor(rows: TickerRow[], opts: { cap?: number; ingestPerTick?: number } = {}) {
    this.rows = rows;
    this.ingestPerTick = opts.ingestPerTick ?? 120;
    this.stream = createTickStream<number, PendingTick>({
      cap: opts.cap ?? 400,
      // Rows here are class instances with domain logic (the tick also rolls the
      // intraday candle), so we call the row rather than use `applyPatches`.
      apply: (batch) => {
        for (const [idx, tick] of batch) this.rows[idx].applyTick(tick.price, tick.volume);
        this.applied = this.stream.applied;
        this.pendingDepth = this.stream.pending;
        this.sampleRate();
      },
    });
  }

  private sampleRate(): void {
    const now = performance.now();
    if (this.windowStart === 0) {
      this.windowStart = now;
      this.windowBase = this.stream.applied;
      return;
    }
    const elapsed = now - this.windowStart;
    if (elapsed < 1000) return;
    this.appliedPerSec = Math.round(((this.stream.applied - this.windowBase) * 1000) / elapsed);
    this.windowStart = now;
    this.windowBase = this.stream.applied;
  }

  // Local PRNG — Math.random is fine in a browser demo, but keeping it self
  // contained makes the tick stream reproducible across runs.
  private rng(): number {
    this.rngState = (this.rngState + 0x6d2b79f5) | 0;
    let t = Math.imul(this.rngState ^ (this.rngState >>> 15), 1 | this.rngState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  private ingest(): void {
    for (let i = 0; i < this.ingestPerTick; i++) {
      const idx = Math.floor(this.rng() * this.rows.length);
      const row = this.rows[idx];
      const move = (this.rng() - 0.5) * row.price * 0.01;
      const price = Math.max(0.5, row.price + move);
      const volume = row.volume + Math.floor(this.rng() * 50_000);
      this.stream.push(idx, { price, volume });
    }
    this.pendingDepth = this.stream.pending;
  }

  start(): void {
    if (this.ingestTimer) return;
    this.stream.start();
    this.ingestTimer = setInterval(() => this.ingest(), 16);
  }

  stop(): void {
    this.stream.stop();
    if (this.ingestTimer) clearInterval(this.ingestTimer);
    this.ingestTimer = null;
    this.windowStart = 0;
    this.appliedPerSec = 0;
  }
}
