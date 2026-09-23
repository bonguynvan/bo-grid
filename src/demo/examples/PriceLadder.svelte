<script lang="ts">
  import { Grid, fmtPrice, type ColumnDef, type GridRow } from '../../lib';
  import { centeredWindow } from '../../lib/realtime';
  import { ui } from '../theme.svelte';

  // A price ladder: MORE levels exist than fit on screen (120 here), kept
  // centered on the spread as the book moves — "scroll-lock". `centeredWindow`
  // is pure array-slicing math; centering is just handing the grid a different
  // slice of the SAME levels array each tick, not scroll control. "Lock" state
  // itself (follow the market vs. hold position) lives here, in the component —
  // it's UI state, not something a library helper can decide for you.
  interface Level extends GridRow {
    side: 'ask' | 'bid';
    price: number;
    size: number;
  }

  const LEVELS = 60; // per side — 120 total, well beyond the visible window
  const VISIBLE = 16;
  const MID = 250;
  const TICK = 0.05;

  function build(): Level[] {
    const asks: Level[] = [];
    let id = 0;
    for (let i = LEVELS; i >= 1; i--) {
      asks.push({ id: id++, side: 'ask', price: MID + i * TICK, size: 40 + Math.floor(Math.random() * 900) });
    }
    const bids: Level[] = [];
    for (let i = 1; i <= LEVELS; i++) {
      bids.push({ id: id++, side: 'bid', price: MID - i * TICK, size: 40 + Math.floor(Math.random() * 900) });
    }
    return [...asks, ...bids]; // index LEVELS-1 / LEVELS is the spread
  }

  const levels = $state<Level[]>(build());
  const spreadIndex = LEVELS; // first bid — the natural centering point

  // `null` = follow the live spread automatically. A number = the viewer paged
  // manually and the ladder holds there until they hit "Recenter".
  let lockedCenter = $state<number | null>(null);

  const centerIndex = $derived(lockedCenter ?? spreadIndex);
  const window_ = $derived(centeredWindow(levels.length, centerIndex, VISIBLE));
  const visible = $derived(levels.slice(window_.start, window_.end) as unknown as GridRow[]);
  const locked = $derived(lockedCenter === null);

  function page(dir: -1 | 1): void {
    lockedCenter = Math.max(0, Math.min(levels.length - 1, centerIndex + dir * 4));
  }
  function recenter(): void {
    lockedCenter = null;
  }

  const columns: ColumnDef[] = [
    { type: 'price', key: 'price', header: 'Price', width: 100, sortable: false },
    { type: 'volume', key: 'size', header: 'Size', width: 90, flash: 'auto', sortable: false },
  ];

  let live = $state(false);
  $effect(() => {
    if (!live) return;
    const h = setInterval(() => {
      for (let n = 0; n < 3; n++) {
        const lvl = levels[Math.floor(Math.random() * levels.length)];
        lvl.size = Math.max(10, lvl.size + Math.floor((Math.random() - 0.5) * 300));
      }
    }, 300);
    return () => clearInterval(h);
  });
</script>

<div class="controls">
  <button class="live" class:on={live} onclick={() => (live = !live)}>
    <span class="dot"></span>{live ? 'Live' : 'Paused'}
  </button>
  <div class="nav">
    <button onclick={() => page(-1)} aria-label="Page up">▲</button>
    <button onclick={() => page(1)} aria-label="Page down">▼</button>
    <button class="recenter" class:on={locked} onclick={recenter} disabled={locked}>
      {locked ? 'Locked to spread' : 'Recenter'}
    </button>
  </div>
  <span class="stat">Showing <strong>{window_.start + 1}–{window_.end}</strong> of {levels.length}</span>
</div>

<div class="gridwrap">
  <Grid rows={visible} {columns} theme={ui.theme} height={VISIBLE * 32} rowHeight={32} rowClass={(r) => (r as Level).side} />
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .stat strong {
    color: var(--text);
  }
  .nav {
    display: flex;
    gap: 6px;
  }
  .nav button,
  .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font: inherit;
    color: var(--text);
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
  }
  .nav button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .recenter.on {
    color: var(--text-dim);
  }
  .live .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--text-dim);
  }
  .live.on .dot {
    background: var(--up);
    box-shadow: 0 0 6px var(--up);
  }
  .gridwrap {
    max-width: 400px;
  }
  :global(.bo-grid .row.ask .num) {
    color: var(--down);
  }
  :global(.bo-grid .row.bid .num) {
    color: var(--up);
  }
</style>
