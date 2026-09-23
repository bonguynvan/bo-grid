<script lang="ts">
  import { candleGeometry } from './chart-math';
  import type { Candle } from '../types';

  let {
    data,
    width = 220,
    height = 60,
    gap = 1,
    upColor = 'var(--boc-up, #16a34a)',
    downColor = 'var(--boc-down, #dc2626)',
    wickWidth = 1,
    ariaLabel = 'Candlestick chart',
    class: klass = '',
  }: {
    data: Candle[];
    width?: number;
    height?: number;
    /** Gap between candle slots (px). */
    gap?: number;
    upColor?: string;
    downColor?: string;
    wickWidth?: number;
    ariaLabel?: string;
    class?: string;
  } = $props();

  const candles = $derived(candleGeometry(data, width, height, gap));
</script>

<svg
  class="boc boc-candle {klass}"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  preserveAspectRatio="none"
  role="img"
  aria-label={ariaLabel}
>
  {#each candles as c, i (i)}
    {@const color = c.up ? upColor : downColor}
    <line x1={c.wickX} y1={c.wickY0} x2={c.wickX} y2={c.wickY1} stroke={color} stroke-width={wickWidth} vector-effect="non-scaling-stroke" />
    <rect x={c.x - c.bodyW / 2} y={c.bodyY} width={c.bodyW} height={c.bodyH} fill={color}
      ><title>{`O ${data[i].open} H ${data[i].high} L ${data[i].low} C ${data[i].close}`}</title></rect
    >
  {/each}
</svg>

<style>
  .boc {
    display: block;
    max-width: 100%;
  }
</style>
