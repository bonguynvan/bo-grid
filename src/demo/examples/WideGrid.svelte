<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A deliberately wide grid (60+ columns) to exercise column virtualization:
  // only the columns within the horizontal scroll window render, so a 60-column
  // grid costs the same as a handful of columns. The Account column is pinned.
  const METRIC_COLS = 60;
  const ROWS = 200;

  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Account', width: 150, pinned: true },
    ...Array.from(
      { length: METRIC_COLS },
      (_, i) =>
        ({
          type: 'number',
          key: `m${i}`,
          header: `Wk ${i + 1}`,
          width: 84,
          decimals: 0,
          // First metric is a soft colour scale to show CF works under virtualization.
          ...(i === 0 ? { colorScale: { min: 0, max: 1000 } } : {}),
        }) as ColumnDef,
    ),
  ];

  const rows = $state<GridRow[]>(
    Array.from({ length: ROWS }, (_, id) => {
      const row: Record<string, unknown> = { id, flashSeq: 0, flashDir: 'up', name: `Account ${id + 1}` };
      for (let i = 0; i < METRIC_COLS; i++) {
        row[`m${i}`] = Math.round((Math.sin(id * 0.3 + i * 0.5) + 1) * 500);
      }
      return row as GridRow;
    }),
  );
</script>

<p class="note">
  {METRIC_COLS + 1} columns × {ROWS} rows. With <code>virtualizeColumns</code>, only the columns in the
  horizontal window render — scroll sideways to page through them. The Account column stays pinned.
</p>

<div class="gridwrap">
  <Grid {rows} {columns} virtualizeColumns theme={ui.theme} height={520} ariaLabel="Wide metrics grid" />
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
    max-width: 900px;
  }
</style>
