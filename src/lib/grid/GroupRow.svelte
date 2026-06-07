<script lang="ts">
  import type { ColumnDef, GridRow } from './column';
  import { colStyle, formatCell, cellValue } from './column';
  import { aggregate } from './aggregate';
  import type { GroupNode } from './grouping';

  let {
    group,
    columns,
    onToggle,
    rowIndex,
  }: {
    group: GroupNode;
    columns: ColumnDef[];
    onToggle: (path: string) => void;
    rowIndex?: number;
  } = $props();

  // Aggregate over the group's leaf rows. Reads row $state values, so group
  // subtotals stay live as the feed ticks (only on-screen groups are rendered).
  function aggText(col: ColumnDef): string {
    // Lazy/server groups carry preformatted aggregate strings (leaf rows aren't
    // loaded), so use those directly when present.
    if (group.aggText) return group.aggText[col.key] ?? '';
    if (col.type === 'sparkline' || col.type === 'text' || !col.groupAgg) return '';
    const vals: number[] = [];
    for (const row of group.rows) {
      const v = Number(cellValue(col, row as GridRow));
      if (Number.isFinite(v)) vals.push(v);
    }
    const a = aggregate(vals);
    if (!a) return '';
    if (col.groupAgg === 'count') return String(a.count);
    return formatCell(col, a[col.groupAgg]);
  }
</script>

<div class="group" role="row" aria-rowindex={rowIndex}>
  <button
    class="toggle"
    type="button"
    style={colStyle(columns[0])}
    aria-expanded={!group.collapsed}
    onclick={() => onToggle(group.path)}
  >
    <span class="chev" style="margin-left:{group.depth * 12}px">{group.collapsed ? '▸' : '▾'}</span>
    <span class="val">{group.value}</span>
    <span class="count">{group.count}</span>
  </button>

  {#each columns as col, ci (ci)}
    {#if ci > 0}
      <span class="agg" style={colStyle(col)}>{aggText(col)}</span>
    {/if}
  {/each}
</div>

<style>
  .group {
    display: flex;
    align-items: stretch;
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, var(--bo-header-bg) 85%, var(--bo-text) 4%);
    border-bottom: 0.5px solid var(--bo-border);
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 600;
    color: var(--bo-text);
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
  }
  .chev {
    font-size: 10px;
    color: var(--bo-text-dim);
  }
  .val {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .count {
    flex: none;
    padding: 0 5px;
    font-family: var(--bo-mono);
    font-size: 10px;
    font-weight: 500;
    color: var(--bo-text-dim);
    background: var(--bo-row-hover);
    border-radius: 999px;
  }
  .agg {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 8px;
    font-family: var(--bo-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    color: var(--bo-text-dim);
    overflow: hidden;
    white-space: nowrap;
  }
</style>
