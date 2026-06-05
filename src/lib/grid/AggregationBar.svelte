<script lang="ts">
  import type { AggKind, AggResult } from './aggregate';
  import { AGG_LABELS } from './aggregate';

  let { result, kinds }: { result: AggResult | null; kinds: AggKind[] } = $props();

  function fmt(v: number): string {
    return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
</script>

{#if result}
  <div class="agg" role="status" aria-live="polite">
    {#each kinds as k (k)}
      <span class="stat">
        <span class="k">{AGG_LABELS[k]}</span>
        <span class="v">{k === 'count' ? result.count : fmt(result[k])}</span>
      </span>
    {/each}
  </div>
{/if}

<style>
  .agg {
    display: flex;
    gap: 18px;
    align-items: center;
    height: 26px;
    padding: 0 10px;
    background: var(--bo-header-bg);
    border-top: 0.5px solid var(--bo-border);
    font-family: var(--bo-mono);
    font-size: 11px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
  }
  .k {
    color: var(--bo-text-dim);
    margin-right: 5px;
  }
  .v {
    color: var(--bo-text);
  }
</style>
