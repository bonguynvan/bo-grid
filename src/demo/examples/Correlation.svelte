<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A correlation matrix: an N×N grid of heatmap cells with a pinned label
  // column. Shows dynamically-built columns, the heatmap cell type across a
  // whole grid, and a pinned column holding position during horizontal scroll.
  const ASSETS = ['Equities', 'Bonds', 'Gold', 'Oil', 'USD', 'BTC', 'Tech', 'Realty', 'EM', 'Cash'];

  function hash(a: number, b: number): number {
    let x = ((Math.min(a, b) * 73856093) ^ (Math.max(a, b) * 19349663)) >>> 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  // Symmetric, deterministic correlation in [-0.7, 0.95]; 1.0 on the diagonal.
  function corr(i: number, j: number): number {
    if (i === j) return 1;
    return Math.round((-0.7 + hash(i, j) * 1.65) * 100) / 100;
  }

  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: '', width: 92, pinned: true, sortable: false },
    ...ASSETS.map(
      (a, j): ColumnDef => ({
        type: 'heatmap',
        key: `c${j}`,
        header: a.slice(0, 4),
        width: 66,
        min: -1,
        max: 1,
        decimals: 2,
        sortable: false,
      }),
    ),
  ];

  const rows = ASSETS.map((name, i) => {
    const row: Record<string, unknown> = { id: i, flashSeq: 0, flashDir: 'up', name };
    ASSETS.forEach((_, j) => (row[`c${j}`] = corr(i, j)));
    return row as GridRow;
  });
</script>

<div class="controls">
  <span class="stat">{ASSETS.length} × {ASSETS.length} correlation matrix</span>
  <span class="dot">·</span>
  <span class="stat">heatmap cells · pinned label column</span>
</div>

<div class="gridwrap">
  <Grid {rows} {columns} theme={ui.theme} height={ASSETS.length * 36 + 40} />
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .dot {
    color: var(--border);
  }
  .gridwrap {
    /* narrower than the matrix so it scrolls — the label column stays pinned */
    max-width: 620px;
  }
</style>
