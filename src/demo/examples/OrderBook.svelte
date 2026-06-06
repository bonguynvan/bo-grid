<script lang="ts">
  import { Grid, fmtPrice, type ColumnDef, type GridRow } from '../../lib';

  // A live order book: ask levels (red) above the spread, bid levels (green)
  // below, each row carrying a cumulative-depth bar. Shows rowClass (per-row
  // colour), a custom depth-bar cell, and realtime size flashes.
  interface Level extends GridRow {
    side: 'ask' | 'bid';
    price: number;
    size: number;
    total: number; // cumulative depth from the spread outward
  }

  const MID = 250;
  const LEVELS = 18;
  const TICK = 0.05;

  // Deterministic seed so the initial book is stable across reloads.
  function mulberry32(seed: number): () => number {
    let a = seed;
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function build(): Level[] {
    const rng = mulberry32(0xb0_0c);
    const asks: Level[] = [];
    let cum = 0;
    let id = 0;
    for (let i = 1; i <= LEVELS; i++) {
      const size = 40 + Math.floor(rng() * 900);
      cum += size;
      asks.push({ id: id++, flashSeq: 0, flashDir: 'up', side: 'ask', price: MID + i * TICK, size, total: cum });
    }
    const bids: Level[] = [];
    cum = 0;
    for (let i = 1; i <= LEVELS; i++) {
      const size = 40 + Math.floor(rng() * 900);
      cum += size;
      bids.push({ id: id++, flashSeq: 0, flashDir: 'up', side: 'bid', price: MID - i * TICK, size, total: cum });
    }
    // Display top→bottom: farthest ask … best ask, best bid … farthest bid.
    return [...asks.reverse(), ...bids];
  }

  const rows = $state<Level[]>(build());
  const gridRows = $derived(rows as unknown as GridRow[]);
  const maxTotal = Math.max(...rows.map((r) => r.total));

  const bestAsk = $derived(Math.min(...rows.filter((r) => r.side === 'ask').map((r) => r.price)));
  const bestBid = $derived(Math.max(...rows.filter((r) => r.side === 'bid').map((r) => r.price)));

  const columns: ColumnDef[] = [
    { type: 'price', key: 'price', header: 'Price', width: 110, sortable: false },
    { type: 'volume', key: 'size', header: 'Size', width: 100, flash: true, sortable: false },
    { type: 'custom', key: 'total', header: 'Depth', flex: 1, sortable: false },
  ];

  let live = $state(false);
  $effect(() => {
    if (!live) return;
    const tick = () => {
      // Nudge a handful of random levels and flash them.
      for (let n = 0; n < 5; n++) {
        const r = rows[Math.floor(Math.random() * rows.length)];
        const next = Math.max(10, r.size + Math.floor((Math.random() - 0.5) * 400));
        r.flashDir = next >= r.size ? 'up' : 'down';
        r.size = next;
        r.flashSeq++;
      }
    };
    const h = setInterval(tick, 500);
    return () => clearInterval(h);
  });
</script>

{#snippet cell({ row }: { row: GridRow })}
  {@const lvl = row as Level}
  <div class="depth">
    <div class="fill {lvl.side}" style:width="{(lvl.total / maxTotal) * 100}%"></div>
    <span class="tot">{lvl.total.toLocaleString()}</span>
  </div>
{/snippet}

<div class="controls">
  <span class="stat ask">Ask <strong>{fmtPrice(bestAsk)}</strong></span>
  <span class="stat bid">Bid <strong>{fmtPrice(bestBid)}</strong></span>
  <span class="stat">Spread <strong>{(bestAsk - bestBid).toFixed(2)}</strong></span>
  <button class="live" class:on={live} onclick={() => (live = !live)}>
    <span class="dot"></span>{live ? 'Live' : 'Paused'}
  </button>
</div>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme="dark"
    height={620}
    rowClass={(r) => (r as Level).side}
    {cell}
  />
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .stat strong {
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .stat.ask strong {
    color: var(--down);
  }
  .stat.bid strong {
    color: var(--up);
  }
  .live {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
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
    max-width: 560px;
  }

  /* Depth-bar cell + per-row side colouring (rows live inside the grid, so the
     row classes are targeted with :global). */
  .depth {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  .depth .fill {
    position: absolute;
    top: 4px;
    bottom: 4px;
    right: 0;
    border-radius: 2px;
    opacity: 0.28;
  }
  .depth .fill.ask {
    background: var(--down);
  }
  .depth .fill.bid {
    background: var(--up);
  }
  .depth .tot {
    position: relative;
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  :global(.bo-grid .row.ask .num) {
    color: var(--down);
  }
  :global(.bo-grid .row.bid .num) {
    color: var(--up);
  }
</style>
