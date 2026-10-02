<script lang="ts">
  import type { FilterEditorProps } from '../../../lib';
  import { BANDS, type Band, type BandFilter } from './workloadBand';

  // Editor for the registered `band` filter. The grid's filter menu draws the
  // frame (title, Clear / Apply, Enter to apply); this only edits the draft.
  let { filter, onChange }: FilterEditorProps<BandFilter> = $props();

  const picked = $derived(new Set<Band>(filter?.bands ?? []));
  function toggle(id: Band) {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next.size ? { kind: 'band', bands: BANDS.map((b) => b.id).filter((b) => next.has(b)) } : null);
  }
</script>

<div class="band-filter" role="group" aria-label="Workload band">
  {#each BANDS as b (b.id)}
    <button type="button" class="band" class:on={picked.has(b.id)} aria-pressed={picked.has(b.id)} onclick={() => toggle(b.id)}>
      {b.label}
    </button>
  {/each}
</div>

<style>
  .band-filter {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 2px 0 4px;
  }
  .band {
    padding: 5px 9px;
    font: inherit;
    font-size: 12px;
    text-align: left;
    color: var(--bo-text);
    background: transparent;
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
    cursor: pointer;
  }
  .band:hover {
    background: var(--bo-row-hover);
  }
  .band.on {
    background: var(--bo-sel-fill);
    border-color: var(--bo-sel-border);
  }
  .band:focus-visible {
    outline: 2px solid var(--bo-sel-border);
    outline-offset: 1px;
  }
</style>
