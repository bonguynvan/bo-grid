// Per-cell tick flash.
//
// The grid derives the flash itself — the consumer just sets `flash: 'auto'` on
// a column and streams new values in. No `flashSeq` bookkeeping in app code.
//
// Why identity-keyed state instead of per-component state: the row loop is keyed
// by VISUAL index, so a mounted <Cell> is recycled to show a different row as you
// scroll. State held inside the component would make every scroll look like a
// tick. Keying on (row id, column key) means a cell only flashes when THAT row's
// THAT column actually changed value, whether or not it was on screen at the time.

/** How a column derives its flash. */
export type FlashMode =
  /** Legacy: driven by the row's own `flashSeq`/`flashDir` (`flash: true`). */
  | 'row'
  /** Derived: green on a rise, red on a fall (`flash: 'auto' | 'up-down'`). */
  | 'up-down'
  /** Derived: a neutral flash on any change, numeric or not (`flash: 'change'`). */
  | 'change';

export type FlashDir = 'up' | 'down' | 'same';

export interface FlashState {
  /** Bumps on every real value change — use it to re-key the flashing element. */
  seq: number;
  dir: FlashDir;
  /** Timestamp of the last change (ms). */
  at: number;
  /** True only on the observation that saw the change. */
  changed: boolean;
}

/** Default flash duration (ms). Matches the CSS animation. */
export const FLASH_MS = 300;

/** Max tracked cells before the oldest are evicted. Generous enough for a full
    price board (rows x flashing columns) while staying bounded on a long
    session with a churning symbol universe. */
const DEFAULT_LIMIT = 20_000;

/** Separator for the composite (row, column) map key — a unit separator, which
    cannot appear in a column key. */
const SEP = String.fromCharCode(31);

/** Translate a column's `flash` setting into a mode, or null when it's off. */
export function resolveFlashMode(
  flash: boolean | 'auto' | 'up-down' | 'change' | undefined,
): FlashMode | null {
  if (flash === true) return 'row';
  if (flash === 'auto' || flash === 'up-down') return 'up-down';
  if (flash === 'change') return 'change';
  return null;
}

/** Is this flash still inside its animation window? Lets a recycled cell render
    a past flash's `seq` without replaying the animation. */
export function isFresh(state: FlashState, now: number, ms: number = FLASH_MS): boolean {
  return state.seq > 0 && now - state.at < ms;
}

function direction(prev: unknown, next: unknown, mode: FlashMode): FlashDir {
  if (mode !== 'up-down') return 'same';
  const a = typeof prev === 'number' ? prev : Number(prev);
  const b = typeof next === 'number' ? next : Number(next);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return 'same';
  return b > a ? 'up' : 'down';
}

interface Entry {
  value: unknown;
  state: FlashState;
}

/**
 * Tracks the last seen value per (row, column) and reports when it changed.
 *
 * `observe` is idempotent: calling it again with the same value returns the same
 * state untouched, so a re-render for an unrelated reason (selection, resize)
 * never re-flashes. One tracker per grid instance.
 */
export class FlashTracker {
  private readonly cells = new Map<string, Entry>();
  private readonly limit: number;

  constructor(opts: { limit?: number } = {}) {
    this.limit = opts.limit ?? DEFAULT_LIMIT;
  }

  get size(): number {
    return this.cells.size;
  }

  observe(
    rowKey: string | number,
    colKey: string,
    value: unknown,
    mode: FlashMode,
    now: number,
  ): FlashState {
    const id = `${rowKey}${SEP}${colKey}`;
    const prev = this.cells.get(id);

    // First sight — record the baseline, never flash. This is what keeps a cell
    // quiet when it scrolls into view or when the grid first paints.
    if (prev === undefined) {
      const state: FlashState = { seq: 0, dir: 'same', at: now, changed: false };
      this.evictIfFull();
      this.cells.set(id, { value, state });
      return state;
    }

    if (Object.is(prev.value, value)) {
      // Unchanged: hand back the stored state, with `changed` cleared so a
      // repeated render doesn't count as a new tick. Still touch it for LRU —
      // a cell that's merely being looked at (scrolled past, re-rendered) is
      // "in use" and shouldn't be the first thing evicted.
      if (prev.state.changed) prev.state = { ...prev.state, changed: false };
      this.touch(id, prev);
      return prev.state;
    }

    const state: FlashState = {
      seq: prev.state.seq + 1,
      dir: direction(prev.value, value, mode),
      at: now,
      changed: true,
    };
    prev.value = value;
    prev.state = state;
    this.touch(id, prev);
    return state;
  }

  reset(): void {
    this.cells.clear();
  }

  // Map iteration order is insertion order — re-inserting a key moves it to the
  // end, which is what makes eviction (below) evict the LEAST-recently-touched
  // entry rather than the longest-lived one. Without this, a cell that keeps
  // ticking would sit at its original insertion position forever and become the
  // eviction target ahead of cells nobody has looked at since first sight —
  // exactly backwards from what a bounded cache should drop first.
  private touch(id: string, entry: Entry): void {
    this.cells.delete(id);
    this.cells.set(id, entry);
  }

  // The head of the (now LRU-ordered) map is the least-recently-touched entry.
  // Drop a batch rather than one at a time to avoid per-tick eviction churn.
  private evictIfFull(): void {
    if (this.cells.size < this.limit) return;
    let drop = Math.max(1, Math.floor(this.limit / 4));
    for (const key of this.cells.keys()) {
      this.cells.delete(key);
      if (--drop <= 0) break;
    }
  }
}
