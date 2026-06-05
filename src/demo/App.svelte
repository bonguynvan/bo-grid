<script lang="ts">
  import { Grid, exportCSV, exportXLSX, createArraySource, type ColumnDef, type GridRow } from '../lib';
  import { generateTickers } from './data/generate';
  import { buildRows, type TickerRow } from './data/rows.svelte';
  import { Feed } from './data/feed.svelte';
  import { FpsMeter } from './perf/fps.svelte';

  const COUNT = 1000;

  // The public Phase 0 surface: declare columns, hand over rows.
  const columns: ColumnDef[] = [
    { type: 'text', key: 'symbol', sub: 'sector', header: 'Symbol', width: 132 },
    { type: 'price', key: 'price', header: 'Price', width: 88, flash: true, groupAgg: 'avg' },
    { type: 'percent', key: 'changePct', header: 'Chg %', width: 84 },
    { type: 'heatmap', key: 'changePct', header: 'Heat', width: 76, min: -5, max: 5 },
    { type: 'volume', key: 'volume', header: 'Volume', width: 90, groupAgg: 'sum' },
    { type: 'number', key: 'target', header: 'Target', width: 78, decimals: 2, editable: true },
    { type: 'date', key: 'listedAt', header: 'Listed', width: 92, dateStyle: 'short' },
    { type: 'sparkline', key: 'candles', sparkKey: 'candles', header: 'Trend (24)', flex: 1 },
  ];

  // Build data + feed ONCE at init — deliberately not inside an $effect.
  // An effect that both reads (`feed?.stop()`) and writes (`feed = ...`) the
  // same $state self-triggers an infinite update loop, which aborts the mount
  // and leaves a blank page.
  const rows = $state<TickerRow[]>(buildRows(generateTickers(COUNT)));
  const feed = new Feed(rows, { cap: 400, ingestPerTick: 120 });
  let live = $state(false);
  let filterText = $state('');
  let groupMode = $state<'none' | 'sector' | 'nested'>('none');
  const meter = new FpsMeter();

  const GROUPS: Record<typeof groupMode, string[]> = {
    none: [],
    sector: ['sector'],
    nested: ['sector', 'exchange'],
  };
  const groupBy = $derived(GROUPS[groupMode]);

  let rowMode = $state<'compact' | 'vary'>('compact');
  // 'vary' returns a per-row height (varies by index) to exercise variable-height
  // virtualization; 'compact' uses the uniform 36px default.
  const rowHeight = $derived<number | ((row: GridRow, i: number) => number) | undefined>(
    rowMode === 'vary' ? (_row: GridRow, i: number) => 40 + (i % 4) * 12 : undefined,
  );

  let pinMode = $state(false);
  // Pinning Symbol + Price; the grid is width-constrained below so the other
  // columns overflow and you can see the pinned columns stay put while scrolling.
  const displayColumns = $derived(
    pinMode
      ? columns.map((c) => (c.key === 'symbol' || c.key === 'price' ? { ...c, pinned: true } : c))
      : columns,
  );

  function toggleLive() {
    live = !live;
    if (live) feed.start();
    else feed.stop();
  }

  let dataMode = $state<'client' | 'server'>('client');
  const gridRows = $derived(rows as unknown as GridRow[]);
  // 'server' wraps the same rows in an async windowed source (simulated latency)
  // to exercise the server-side code path: windowed fetch, skeletons, delegated
  // sort/filter. Grouping is client-only, so it's ignored in this mode.
  const source = $derived(
    dataMode === 'server'
      ? createArraySource(gridRows, { latency: 220, filterKeys: ['symbol', 'sector', 'name'] })
      : undefined,
  );

  function downloadCsv() {
    exportCSV('tickers.csv', gridRows, columns);
  }
  async function downloadXlsx() {
    await exportXLSX('tickers.xlsx', gridRows, columns);
  }

  $effect(() => {
    meter.start();
    return () => {
      feed.stop();
      meter.stop();
    };
  });

  const fpsClass = $derived(meter.fps >= 55 ? 'ok' : meter.fps >= 40 ? 'warn' : 'bad');
</script>

<header class="bar">
  <div class="title">
    <span class="logo">bo-grid</span>
    <span class="tag">sparklines + realtime over virtual scroll</span>
    <a class="apilink" href="./api.html">API docs ↗</a>
  </div>

  <div class="metrics">
    <div class="seg" role="group" aria-label="Data mode">
      <button class:on={dataMode === 'client'} onclick={() => (dataMode = 'client')}>Client</button>
      <button class:on={dataMode === 'server'} onclick={() => (dataMode = 'server')}>Server</button>
    </div>
    <div class="seg" role="group" aria-label="Row height">
      <button class:on={rowMode === 'compact'} onclick={() => (rowMode = 'compact')}>Compact</button>
      <button class:on={rowMode === 'vary'} onclick={() => (rowMode = 'vary')}>Vary</button>
    </div>
    <div class="seg" role="group" aria-label="Group rows by">
      <button class:on={groupMode === 'none'} onclick={() => (groupMode = 'none')}>Flat</button>
      <button class:on={groupMode === 'sector'} onclick={() => (groupMode = 'sector')}>Sector</button>
      <button class:on={groupMode === 'nested'} onclick={() => (groupMode = 'nested')}>
        Sector › Exch
      </button>
    </div>
    <input
      class="filter"
      type="search"
      placeholder="Filter…"
      bind:value={filterText}
      aria-label="Filter rows"
    />
    <span class="metric {fpsClass}" title="frames per second">{meter.fps} fps</span>
    <span class="metric">{COUNT.toLocaleString()} rows</span>
    <span class="metric">{feed.applied.toLocaleString()} ticks applied</span>
    <span class="metric">{feed.pendingDepth} queued</span>
    <button class="live" class:on={pinMode} onclick={() => (pinMode = !pinMode)}>Pin L</button>
    <div class="seg">
      <button onclick={downloadCsv}>CSV</button>
      <button onclick={downloadXlsx}>XLSX</button>
    </div>
    <button class="live" class:on={live} onclick={toggleLive}>
      <span class="dot"></span>{live ? 'Live' : 'Paused'}
    </button>
  </div>
</header>

<main>
  <div class="gridwrap" style:max-width={pinMode ? '680px' : null}>
    <Grid
      rows={dataMode === 'server' ? [] : gridRows}
      columns={displayColumns}
      filter={filterText}
      groupBy={dataMode === 'server' ? [] : groupBy}
      {source}
      {rowHeight}
      persistKey="demo"
      height={640}
      onCellEdit={(e) => ((e.row as Record<string, unknown>)[e.column.key] = e.value)}
    />
  </div>
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 18px;
    border-bottom: 0.5px solid var(--border);
    background: var(--header-bg);
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .logo {
    font-family: var(--mono);
    font-weight: 700;
    font-size: 15px;
  }
  .tag {
    font-size: 12px;
    color: var(--text-dim);
  }
  .apilink {
    font-size: 12px;
    color: var(--up);
    text-decoration: none;
  }
  .apilink:hover {
    text-decoration: underline;
  }
  .metrics {
    display: flex;
    align-items: center;
    gap: 14px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .seg {
    display: inline-flex;
    border: 0.5px solid var(--border);
    border-radius: 999px;
    overflow: hidden;
  }
  .seg button {
    padding: 4px 10px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    background: transparent;
    border: 0;
    cursor: pointer;
  }
  .seg button.on {
    color: #0a0a0a;
    background: var(--up);
  }
  .filter {
    width: 160px;
    padding: 4px 10px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
    background: #0a0a0a;
    border: 0.5px solid var(--border);
    border-radius: 999px;
    outline: none;
  }
  .filter:focus {
    border-color: var(--up);
  }
  .metric {
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
  }
  .metric.ok {
    color: var(--up);
  }
  .metric.warn {
    color: var(--amber);
  }
  .metric.bad {
    color: var(--down);
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
  main {
    flex: 1;
    padding: 18px;
    overflow: hidden;
  }
</style>
