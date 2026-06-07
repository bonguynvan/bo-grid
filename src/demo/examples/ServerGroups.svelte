<script lang="ts">
  import { Grid, type ColumnDef, type GridRow, type LazyGroup } from '../../lib';
  import { ui } from '../theme.svelte';

  // Server-side grouping: group summaries (count + total) come up front; each
  // group's orders load on expand (simulated ~260ms latency) with a loading row.
  const fmtUsd = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

  const REGIONS = [
    { key: 'North America', count: 142, total: 2_400_000 },
    { key: 'Europe', count: 98, total: 1_800_000 },
    { key: 'Asia Pacific', count: 120, total: 2_050_000 },
    { key: 'Latin America', count: 41, total: 620_000 },
  ];

  const lazyGroups: LazyGroup[] = REGIONS.map((r) => ({
    key: r.key,
    count: r.count,
    agg: { amount: fmtUsd(r.total) }, // preformatted server aggregate (shown in header)
  }));

  const STATUS = ['Paid', 'Pending', 'Refunded'];
  const NAMES = ['Acme', 'Globex', 'Initech', 'Umbrella', 'Soylent', 'Hooli', 'Stark', 'Wayne'];
  let nextId = 5000;
  function makeOrders(key: string): GridRow[] {
    const n = 5 + (key.length % 5);
    return Array.from({ length: n }, (_, i) => ({
      id: nextId++,
      flashSeq: 0,
      flashDir: 'up' as const,
      customer: `${NAMES[(i + key.length) % NAMES.length]} ${key.split(' ')[0]} #${i + 1}`,
      amount: 5000 + ((i * 8123 + key.length * 1700) % 90000),
      status: STATUS[(i + key.length) % STATUS.length],
    })) as unknown as GridRow[];
  }

  const loadGroup = (key: string): Promise<GridRow[]> =>
    new Promise((resolve) => setTimeout(() => resolve(makeOrders(key)), 260));

  const columns: ColumnDef[] = [
    { type: 'text', key: 'customer', header: 'Customer', flex: 1, minWidth: 220 },
    { type: 'currency', key: 'amount', header: 'Amount', width: 130, currency: 'USD', decimals: 0, groupAgg: 'sum' },
    {
      type: 'badge',
      key: 'status',
      header: 'Status',
      width: 120,
      tones: { Paid: 'up', Pending: 'amber', Refunded: 'down' },
    },
  ];
</script>

<p class="note sg-note">
  {REGIONS.length} regions; counts and totals come from the "server" up front. Expand a region to load its orders.
</p>

<div class="gridwrap">
  <Grid
    rows={[]}
    {columns}
    {lazyGroups}
    {loadGroup}
    theme={ui.theme}
    height={520}
    ariaLabel="Orders by region (server-side groups)"
  />
</div>

<style>
  .note {
    margin: 0 0 12px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
    max-width: 760px;
  }
  .gridwrap {
    max-width: 760px;
  }
</style>
