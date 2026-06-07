<script lang="ts">
  import { donutArcs } from './chart-math';
  import { CHART_PALETTE } from './palette';

  type Slice = { value: number; color?: string; label?: string };

  let {
    data,
    size = 120,
    thickness = 18,
    colors = CHART_PALETTE,
    ariaLabel = 'Donut chart',
    class: klass = '',
  }: {
    /** Plain values, or `{ value, color?, label? }` objects. */
    data: number[] | Slice[];
    size?: number;
    /** Ring thickness (px); `>= size/2` renders a full pie. */
    thickness?: number;
    colors?: readonly string[];
    ariaLabel?: string;
    class?: string;
  } = $props();

  const values = $derived(data.map((d) => (typeof d === 'number' ? d : d.value)));
  const arcs = $derived(donutArcs(values, size, thickness));
  function colorOf(i: number): string {
    const d = data[i];
    if (typeof d !== 'number' && d.color) return d.color;
    return colors[i % colors.length];
  }
</script>

<svg
  class="boc boc-donut {klass}"
  viewBox="0 0 {size} {size}"
  width={size}
  height={size}
  role="img"
  aria-label={ariaLabel}
>
  {#each arcs as a (a.index)}
    {@const d = data[a.index]}
    <path d={a.d} fill={colorOf(a.index)} fill-rule="evenodd">
      <title>{typeof d !== 'number' && d.label ? `${d.label}: ` : ''}{a.value}</title>
    </path>
  {/each}
</svg>

<style>
  .boc {
    display: block;
  }
</style>
