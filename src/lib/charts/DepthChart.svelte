<script lang="ts">
  import { depthBars } from './chart-math';

  let {
    bids,
    asks,
    width = 220,
    height = 60,
    bidColor = 'var(--boc-up, #16a34a)',
    askColor = 'var(--boc-down, #dc2626)',
    ariaLabel = 'Order book depth chart',
    class: klass = '',
  }: {
    /** Bid level sizes, nearest-to-spread first (index 0 = best bid). */
    bids: number[];
    /** Ask level sizes, nearest-to-spread first (index 0 = best ask). */
    asks: number[];
    width?: number;
    height?: number;
    bidColor?: string;
    askColor?: string;
    ariaLabel?: string;
    class?: string;
  } = $props();

  const bars = $derived(depthBars(bids, asks, width, height));
</script>

<svg
  class="boc boc-depth {klass}"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  preserveAspectRatio="none"
  role="img"
  aria-label={ariaLabel}
>
  {#each bars as b, i (i)}
    <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.side === 'bid' ? bidColor : askColor} fill-opacity="0.75"
      ><title>{b.side} depth {b.cum}</title></rect
    >
  {/each}
  <!-- Spread divider at the horizontal center. This lines up with depthBars'
       computed centerX by construction — `pad + (w - pad*2)/2` always reduces
       to `w/2` for any pad — not a coincidence, but also not enforced by a
       test, so a future change to that formula could silently misalign this. -->
  <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke="currentColor" stroke-opacity="0.25" stroke-width="1" vector-effect="non-scaling-stroke" />
</svg>

<style>
  .boc {
    display: block;
    max-width: 100%;
  }
</style>
