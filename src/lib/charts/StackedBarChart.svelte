<script lang="ts">
  import { stackedBars, groupedBars } from './chart-math';
  import { CHART_PALETTE } from './palette';

  let {
    data,
    width = 160,
    height = 60,
    gap = 3,
    grouped = false,
    colors = CHART_PALETTE,
    seriesLabels = [],
    radius = 1,
    ariaLabel = 'Bar chart',
    class: klass = '',
  }: {
    /** Series of category values: `data[series][category]`. */
    data: number[][];
    width?: number;
    height?: number;
    gap?: number;
    /** Side-by-side bars per category instead of a stack. */
    grouped?: boolean;
    colors?: readonly string[];
    /** Optional series names — shown in each segment's hover tooltip. */
    seriesLabels?: string[];
    radius?: number;
    ariaLabel?: string;
    class?: string;
  } = $props();

  const segs = $derived(grouped ? groupedBars(data, width, height, gap) : stackedBars(data, width, height, gap));
</script>

<svg
  class="boc boc-stacked {klass}"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  preserveAspectRatio="none"
  role="img"
  aria-label={ariaLabel}
>
  {#each segs as seg, i (i)}
    <rect x={seg.x} y={seg.y} width={seg.w} height={seg.h} rx={radius} fill={colors[seg.series % colors.length]}>
      <title>{seriesLabels[seg.series] ? `${seriesLabels[seg.series]}: ` : ''}{seg.value}</title>
    </rect>
  {/each}
</svg>

<style>
  .boc {
    display: block;
    max-width: 100%;
  }
</style>
