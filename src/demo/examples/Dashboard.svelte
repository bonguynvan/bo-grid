<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { BarChart, LineChart, DonutChart, StackedBarChart, Legend } from '../../lib/charts';
  import { ui } from '../theme.svelte';

  // An analytics dashboard — the charts companion used both standalone (KPI
  // cards) and inside grid cells (the Trend column is a custom LineChart).
  interface Region extends GridRow {
    region: string;
    revenue: number;
    delta: number;
    share: number;
    trend: number[];
  }

  const REGIONS = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East', 'Africa'];

  function series(seed: number, n = 12): number[] {
    // Deterministic pseudo-random walk so reloads are stable.
    let v = 40 + (seed % 30);
    return Array.from({ length: n }, (_, i) => {
      v += ((Math.sin(seed * 1.7 + i * 0.9) + Math.cos(seed + i)) * 6);
      return Math.max(6, Math.round(v));
    });
  }

  const rows = $state<Region[]>(
    REGIONS.map((region, id) => {
      const trend = series(id + 3);
      const revenue = trend.reduce((a, b) => a + b, 0) * 1000;
      return {
        id,
        flashSeq: 0,
        flashDir: 'up' as const,
        region,
        revenue,
        delta: Math.round((trend[trend.length - 1] / trend[0] - 1) * 100),
        share: 0, // filled below
        trend,
      };
    }),
  );
  const totalRevenue = $derived(rows.reduce((a, r) => a + r.revenue, 0));
  // Share of total (computed column also demonstrates value()).
  const gridRows = $derived(rows as unknown as GridRow[]);

  // KPI aggregates for the stat cards.
  const monthlyTotals = $derived(
    Array.from({ length: 12 }, (_, m) => rows.reduce((a, r) => a + r.trend[m], 0)),
  );
  const donutData = $derived(rows.map((r) => ({ value: r.revenue, label: r.region })));
  // Top-3 regions, quarterly (sample every other month) — a stacked series.
  const topRegions = $derived(rows.slice(0, 3));
  const stackData = $derived(topRegions.map((r) => r.trend.filter((_, i) => i % 2 === 0)));
  const fmtUsd = (n: number) => `$${(n / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k`;

  const columns: ColumnDef[] = [
    { type: 'text', key: 'region', header: 'Region', width: 150, pinned: true },
    { type: 'currency', key: 'revenue', header: 'Revenue', width: 120, currency: 'USD', decimals: 0, groupAgg: 'sum' },
    { type: 'percent', key: 'delta', header: '12-mo Δ', width: 96, colorScale: { mid: 0 } },
    { type: 'number', key: 'share', header: 'Share', width: 120, decimals: 1, dataBar: { min: 0 }, value: (r) => ((r.revenue as number) / totalRevenue) * 100 },
    { type: 'custom', key: 'trend', header: 'Trend (12 mo)', flex: 1, minWidth: 160 },
  ];
</script>

<div class="cards">
  <div class="card">
    <span class="k">Total revenue</span>
    <strong>{fmtUsd(totalRevenue)}</strong>
    <LineChart data={monthlyTotals} width={220} height={44} area color="var(--up)" class="card-chart" />
  </div>
  <div class="card">
    <span class="k">Monthly volume</span>
    <strong>{monthlyTotals[monthlyTotals.length - 1].toLocaleString()}</strong>
    <BarChart data={monthlyTotals} width={220} height={44} color="var(--accent, #6366f1)" class="card-chart" />
  </div>
  <div class="card donut">
    <span class="k">Revenue by region</span>
    <DonutChart data={donutData} size={88} thickness={14} />
    <ul class="legend">
      {#each rows.slice(0, 4) as r, i (r.id)}
        <li><span class="dot" style="background:var(--boc-{i + 1})"></span>{r.region}</li>
      {/each}
    </ul>
  </div>
  <div class="card">
    <span class="k">Top regions · quarterly</span>
    <StackedBarChart
      data={stackData}
      width={220}
      height={48}
      seriesLabels={topRegions.map((r) => r.region)}
      class="card-chart"
    />
    <Legend items={topRegions.map((r) => ({ label: r.region }))} />
  </div>
</div>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme={ui.theme}
    height={320}
    footer
    ariaLabel="Regional performance"
  >
    {#snippet cell({ row })}
      <LineChart data={(row as Region).trend} width={140} height={26} color="var(--up)" />
    {/snippet}
  </Grid>
</div>

<style>
  /* Theme the chart palette from the demo's design tokens. */
  .cards,
  .gridwrap {
    --boc-1: var(--up);
    --boc-2: #6366f1;
    --boc-3: var(--amber);
    --boc-4: var(--down);
    --boc-color: var(--up);
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
    margin-bottom: 16px;
  }
  .card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    background: var(--header-bg);
    border: 0.5px solid var(--border);
    border-radius: 10px;
  }
  .card .k {
    font-size: 11px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .card strong {
    font-size: 22px;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }
  .card :global(.card-chart) {
    margin-top: 8px;
    width: 100%;
  }
  .card.donut {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .card.donut .k {
    flex-basis: 100%;
  }
  .legend {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11px;
    color: var(--text-dim);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
  .gridwrap {
    max-width: 760px;
  }
</style>
