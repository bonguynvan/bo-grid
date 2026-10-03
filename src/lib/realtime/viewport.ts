// Subscribe a market-data feed to just the symbols on screen.
//
// A price board of 1,600 symbols shows 30–80 at a time. Feed `update` the
// grid's `onViewportChange` and it keeps the feed subscribed to exactly the
// rows in view: the first view subscribes at once; after that, changes settle
// for `delay` ms (a fast scroll is one change, not one per frame) and then
// subscribe the symbols that came into view and unsubscribe the ones that left.
//
//   const subs = createViewportSubscriptions({
//     key: (row) => row.symbol,
//     subscribe: (syms) => socket.send({ op: 'sub', syms }),
//     unsubscribe: (syms) => socket.send({ op: 'unsub', syms }),
//   });
//   <Grid {rows} {columns} onViewportChange={subs.update} />
//   onDestroy(subs.clear);
import type { ViewportRange } from '../grid/api';

export interface ViewportSubscriptionsOptions<R, K> {
  /** The feed key of a row (its symbol). */
  key: (row: R) => K;
  /** Start streaming these keys. Called with at least one key. */
  subscribe: (keys: K[]) => void;
  /** Stop streaming these keys. Called with at least one key. */
  unsubscribe: (keys: K[]) => void;
  /** How long the view must stay put before a change is applied, in ms.
      Default 150; 0 applies every change at once. */
  delay?: number;
}

export interface ViewportSubscriptions<K> {
  /** Hand it every view change — pass it as the grid's `onViewportChange`. */
  update: (view: ViewportRange) => void;
  /** Apply a pending change now. */
  flush: () => void;
  /** Unsubscribe everything and drop a pending change (unmount, disconnect). */
  clear: () => void;
  /** The keys currently subscribed. */
  readonly active: ReadonlySet<K>;
}

export const DEFAULT_VIEWPORT_DELAY = 150;

export function createViewportSubscriptions<R, K>(
  opts: ViewportSubscriptionsOptions<R, K>,
): ViewportSubscriptions<K> {
  const delay = opts.delay ?? DEFAULT_VIEWPORT_DELAY;
  let active = new Set<K>();
  let wanted: Set<K> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancel(): void {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  function apply(): void {
    cancel();
    if (!wanted) return;
    const next = wanted;
    wanted = null;
    const added: K[] = [];
    const gone: K[] = [];
    for (const k of next) if (!active.has(k)) added.push(k);
    for (const k of active) if (!next.has(k)) gone.push(k);
    active = next;
    // Subscribe first so a symbol moving within the view never drops a tick.
    if (added.length) opts.subscribe(added);
    if (gone.length) opts.unsubscribe(gone);
  }

  return {
    update(view) {
      const next = new Set<K>();
      for (const row of view.rows as unknown as R[]) next.add(opts.key(row));
      wanted = next;
      if (delay <= 0 || active.size === 0) apply();
      else {
        cancel();
        timer = setTimeout(apply, delay);
      }
    },
    flush: apply,
    clear() {
      cancel();
      wanted = null;
      const gone = [...active];
      active = new Set();
      if (gone.length) opts.unsubscribe(gone);
    },
    get active() {
      return active;
    },
  };
}
