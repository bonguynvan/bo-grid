<script lang="ts">
  import { untrack } from 'svelte';
  import type { CellEditorProps } from '../../../lib';

  // A custom cell editor: pick 1–5 stars. Click (or ←/→ then Enter) commits;
  // Escape cancels (handled by the grid). Makes the display-only `rating` type
  // editable.
  let { value, column, commit }: CellEditorProps = $props();

  const max = $derived(Number((column as { max?: number }).max ?? 5));
  // Seeded once: the editor is created fresh for each edit.
  let current = $state(untrack(() => Math.round(Number(value) || 0)));

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') current = Math.min(max, current + 1);
    else if (e.key === 'ArrowLeft') current = Math.max(1, current - 1);
    else if (e.key === 'Enter') commit(current);
  }
</script>

<span class="rating-editor" role="radiogroup" aria-label="Rating" tabindex="0" onkeydown={onKey}>
  {#each Array.from({ length: max }, (_, i) => i + 1) as n (n)}
    <button
      type="button"
      class="star"
      class:on={n <= current}
      role="radio"
      aria-checked={n === current}
      aria-label="{n} of {max}"
      tabindex="-1"
      onpointerenter={() => (current = n)}
      onclick={() => commit(n)}>★</button
    >
  {/each}
</span>

<style>
  .rating-editor {
    display: inline-flex;
    gap: 1px;
    outline: none;
  }
  .rating-editor:focus-visible {
    outline: 2px solid var(--bo-sel-border);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .star {
    padding: 0 1px;
    font-size: 15px;
    line-height: 1;
    color: var(--bo-text-dim);
    background: none;
    border: 0;
    cursor: pointer;
    opacity: 0.45;
  }
  .star.on {
    color: #f59e0b;
    opacity: 1;
  }
</style>
