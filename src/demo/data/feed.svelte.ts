import type { TickerRow } from './rows.svelte';

interface PendingTick {
  price: number;
  volume: number;
}

/**
 * Simulated realtime feed (stands in for a websocket).
 *
 * Two-stage on purpose — this is the core of the realtime-meets-virtual-scroll
 * risk spike:
 *   1. ingest()  raw ticks arrive fast and coalesce into a pending map
 *      (last-write-wins per row). No reactive writes here → cheap.
 *   2. flush()   on each animation frame, drain at most `cap` pending rows and
 *      write them to $state. Capping bounds reactive work per frame so a burst
 *      of 10k ticks can't blow the frame budget.
 *
 * Off-screen rows still update their state; the virtual list simply doesn't
 * mount them, so no DOM work happens until they scroll into view.
 */
export class Feed {
  private readonly rows: TickerRow[];
  private readonly pending = new Map<number, PendingTick>();
  private readonly cap: number;
  private readonly ingestPerTick: number;

  private rngState = 0x1234_5678;
  private ingestTimer: ReturnType<typeof setInterval> | null = null;
  private rafId = 0;
  private running = false;

  // Live metrics for the demo status bar.
  applied = $state(0);
  pendingDepth = $state(0);

  constructor(rows: TickerRow[], opts: { cap?: number; ingestPerTick?: number } = {}) {
    this.rows = rows;
    this.cap = opts.cap ?? 400;
    this.ingestPerTick = opts.ingestPerTick ?? 120;
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
      this.pending.set(idx, { price, volume });
    }
    this.pendingDepth = this.pending.size;
  }

  private flush = (): void => {
    if (!this.running) return;
    let n = 0;
    for (const [idx, tick] of this.pending) {
      this.rows[idx].applyTick(tick.price, tick.volume);
      this.pending.delete(idx);
      if (++n >= this.cap) break;
    }
    if (n > 0) this.applied += n;
    this.pendingDepth = this.pending.size;
    this.rafId = requestAnimationFrame(this.flush);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.ingestTimer = setInterval(() => this.ingest(), 16);
    this.rafId = requestAnimationFrame(this.flush);
  }

  stop(): void {
    this.running = false;
    if (this.ingestTimer) clearInterval(this.ingestTimer);
    cancelAnimationFrame(this.rafId);
    this.ingestTimer = null;
  }
}
