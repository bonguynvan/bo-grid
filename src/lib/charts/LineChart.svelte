<script lang="ts">
  import { linePoints, linePath, areaPath } from './chart-math';
  import { CHART_COLOR } from './palette';

  let {
    data,
    width = 120,
    height = 36,
    color = CHART_COLOR,
    area = false,
    strokeWidth = 1.5,
    ariaLabel = 'Line chart',
    class: klass = '',
  }: {
    data: number[];
    width?: number;
    height?: number;
    color?: string;
    /** Fill the area under the line (a soft tint of `color`). */
    area?: boolean;
    strokeWidth?: number;
    ariaLabel?: string;
    class?: string;
  } = $props();

  const points = $derived(linePoints(data, width, height, strokeWidth));
  const d = $derived(linePath(points));
  const fillD = $derived(area ? areaPath(points, height - strokeWidth) : '');
</script>

<svg
  class="boc boc-line {klass}"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  preserveAspectRatio="none"
  role="img"
  aria-label={ariaLabel}
>
  {#if area && fillD}
    <path d={fillD} fill={color} fill-opacity="0.14" stroke="none" />
  {/if}
  <path
    d={d}
    fill="none"
    stroke={color}
    stroke-width={strokeWidth}
    stroke-linejoin="round"
    stroke-linecap="round"
    vector-effect="non-scaling-stroke"
  />
</svg>

<style>
  .boc {
    display: block;
    max-width: 100%;
  }
</style>
