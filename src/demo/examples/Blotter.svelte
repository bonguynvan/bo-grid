<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // An execution blotter: each order fills in several prints, so account,
  // order and symbol repeat down the fills. `spanRows` merges the repetition
  // (hierarchically — a symbol never merges across two orders), and broker
  // notes span the fill columns with `colSpan`.
  interface Fill extends GridRow {
    account: string;
    order: string;
    symbol: string;
    side: 'Buy' | 'Sell';
    time: string;
    qty: number;
    price: number;
    note?: string;
  }

  const ACCOUNTS = ['ACC-1042', 'ACC-2210', 'ACC-3388'];
  const SYMBOLS = ['VNM', 'FPT', 'HPG', 'MWG', 'VCB'];

  function build(): Fill[] {
    const out: Fill[] = [];
    let id = 0;
    let minute = 0;
    for (let o = 0; o < 14; o++) {
      const account = ACCOUNTS[Math.floor(o / 5) % ACCOUNTS.length];
      const symbol = SYMBOLS[(o * 3) % SYMBOLS.length];
      const side = o % 3 === 0 ? 'Sell' : 'Buy';
      const order = `ORD-${7100 + o}`;
      const base = 20 + ((o * 37) % 80);
      const fills = 2 + (o % 3);
      for (let f = 0; f < fills; f++) {
        minute += 1 + ((o + f) % 3);
        const hh = 9 + Math.floor(minute / 60);
        const mm = String(minute % 60).padStart(2, '0');
        out.push({
          id: id++,
          account,
          order,
          symbol,
          side,
          time: `${hh}:${mm}`,
          qty: 100 * (1 + ((o + f * 5) % 9)),
          price: base + f * 0.05,
        });
      }
      if (o % 4 === 1) {
        out.push({ id: id++, account, order, symbol, side, time: '', qty: 0, price: 0, note: `Broker note: ${order} routed via DMA, partial fills aggregated.` });
      }
    }
    return out;
  }

  const rows = $state<Fill[]>(build());
  const gridRows = $derived(rows as unknown as GridRow[]);

  const isNote = (r: GridRow) => !!(r as Fill).note;
  const columns: ColumnDef[] = [
    { type: 'text', key: 'account', header: 'Account', width: 110, spanRows: true, pinned: 'left' },
    { type: 'text', key: 'order', header: 'Order', width: 104, spanRows: true },
    { type: 'text', key: 'symbol', header: 'Symbol', width: 84, spanRows: true },
    { type: 'text', key: 'side', header: 'Side', width: 70, spanRows: true, cellClass: (v) => (v === 'Buy' ? 'side-buy' : 'side-sell') },
    {
      type: 'text',
      key: 'time',
      header: 'Time',
      width: 80,
      colSpan: (r) => (isNote(r) ? 3 : 1),
      format: (v, r) => (r && isNote(r) ? String((r as Fill).note) : String(v)),
    },
    { type: 'number', key: 'qty', header: 'Qty', width: 90, decimals: 0 },
    { type: 'price', key: 'price', header: 'Price', flex: 1 },
  ];
</script>

<p class="hint">
  Account → Order → Symbol → Side merge down their fills (<code>spanRows</code>), hierarchically; broker
  notes span Time·Qty·Price (<code>colSpan</code>). Sort, filter and copy still see every row.
</p>
<div class="gridwrap">
  <Grid rows={gridRows} {columns} height={520} theme={ui.theme} ariaLabel="Execution blotter" />
</div>

<style>
  .hint {
    margin: 0 0 10px;
    font-size: 12px;
    color: var(--dim, #8a8a8a);
  }
  .gridwrap :global(.side-buy) {
    color: var(--bo-up);
  }
  .gridwrap :global(.side-sell) {
    color: var(--bo-down);
  }
</style>
