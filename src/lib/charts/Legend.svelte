<script lang="ts">
  import { CHART_PALETTE } from './palette';

  let {
    items,
    colors = CHART_PALETTE,
    class: klass = '',
  }: {
    /** Legend entries; `color` defaults to the palette by position. */
    items: { label: string; color?: string }[];
    colors?: readonly string[];
    class?: string;
  } = $props();
</script>

<ul class="boc-legend {klass}">
  {#each items as item, i (item.label + i)}
    <li>
      <span class="boc-legend-dot" style="background:{item.color ?? colors[i % colors.length]}"></span>
      {item.label}
    </li>
  {/each}
</ul>

<style>
  .boc-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 11px;
    color: var(--boc-legend-color, inherit);
  }
  .boc-legend li {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .boc-legend-dot {
    flex: none;
    width: 9px;
    height: 9px;
    border-radius: 2px;
  }
</style>
