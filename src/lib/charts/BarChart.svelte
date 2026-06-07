<script lang="ts">
  import { barRects } from './chart-math';
  import { CHART_COLOR } from './palette';

  let {
    data,
    width = 120,
    height = 36,
    gap = 2,
    color = CHART_COLOR,
    radius = 1,
    ariaLabel = 'Bar chart',
    class: klass = '',
  }: {
    /** Series values; negative values draw below the zero axis. */
    data: number[];
    width?: number;
    height?: number;
    /** Gap between bars (px). */
    gap?: number;
    /** Bar colour (CSS colour or var). */
    color?: string;
    radius?: number;
    ariaLabel?: string;
    class?: string;
  } = $props();

  const bars = $derived(barRects(data, width, height, gap));
</script>

<svg
  class="boc boc-bar {klass}"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  preserveAspectRatio="none"
  role="img"
  aria-label={ariaLabel}
>
  {#each bars as b, i (i)}
    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={radius} fill={color}><title>{data[i]}</title></rect>
  {/each}
</svg>

<style>
  .boc {
    display: block;
    max-width: 100%;
  }
</style>
