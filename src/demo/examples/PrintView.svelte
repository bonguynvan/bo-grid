<script lang="ts">
  import { Grid, toHTMLTable, printTable, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // The grid virtualizes (only a screenful of rows is in the DOM), so printing it
  // drops most rows. toHTMLTable / printTable render ALL rows to a clean table.
  interface Sale extends GridRow {
    product: string;
    region: string;
    units: number;
    revenue: number;
  }
  const PRODUCTS = ['Widget', 'Gadget', 'Sprocket', 'Cog', 'Gizmo', 'Doohickey'];
  const REGIONS = ['NA', 'EMEA', 'APAC', 'LATAM'];

  const rows = $state<Sale[]>(
    Array.from({ length: 50 }, (_, id) => ({
      id,
      flashSeq: 0,
      flashDir: 'up' as const,
      product: `${PRODUCTS[id % PRODUCTS.length]} ${100 + id}`,
      region: REGIONS[id % REGIONS.length],
      units: 20 + ((id * 37) % 480),
      revenue: (20 + ((id * 37) % 480)) * (50 + (id % 40)),
    })),
  );
  const gridRows = $derived(rows as unknown as GridRow[]);

  const columns: ColumnDef[] = [
    { type: 'text', key: 'product', header: 'Product', flex: 1, minWidth: 160 },
    { type: 'text', key: 'region', header: 'Region', width: 100 },
    { type: 'number', key: 'units', header: 'Units', width: 100, decimals: 0, groupAgg: 'sum' },
    { type: 'price', key: 'revenue', header: 'Revenue', width: 130, groupAgg: 'sum' },
  ];

  let showPreview = $state(false);
  const tableHtml = $derived(toHTMLTable(gridRows, columns));
</script>

<div class="controls">
  <button class="btn primary print-btn" type="button" onclick={() => printTable(gridRows, columns, { title: 'Sales report' })}>
    🖨 Print all rows
  </button>
  <button class="btn print-preview-btn" type="button" onclick={() => (showPreview = !showPreview)}>
    {showPreview ? 'Hide' : 'Show'} printable table
  </button>
  <span class="hint">The grid virtualizes (~a screenful of rows); print/preview render all {rows.length}.</span>
</div>

<div class="gridwrap">
  <Grid rows={gridRows} {columns} theme={ui.theme} height={300} footer ariaLabel="Sales" />
</div>

{#if showPreview}
  <div class="preview">
    <!-- toHTMLTable escapes all values; the markup structure is ours. -->
    {@html tableHtml}
  </div>
{/if}

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .btn {
    padding: 5px 12px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 7px;
    cursor: pointer;
  }
  .btn:hover {
    color: var(--text);
  }
  .btn.primary {
    color: #0a0a0a;
    background: var(--up);
    border-color: var(--up);
  }
  .btn:focus-visible {
    outline: 2px solid var(--up);
    outline-offset: 2px;
  }
  .hint {
    color: var(--text-dim);
  }
  .gridwrap {
    max-width: 640px;
  }
  .preview {
    max-width: 640px;
    margin-top: 16px;
    max-height: 280px;
    overflow: auto;
    border: 0.5px solid var(--border);
    border-radius: 10px;
  }
  .preview :global(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  .preview :global(th),
  .preview :global(td) {
    padding: 4px 10px;
    border: 0.5px solid var(--border);
    white-space: nowrap;
    color: var(--text);
  }
  .preview :global(thead th) {
    position: sticky;
    top: 0;
    background: var(--header-bg);
    font-weight: 600;
  }
</style>
