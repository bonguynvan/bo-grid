<script lang="ts">
  // Floating columns panel: toggle column visibility (and restore hidden ones).
  // Lazy-loaded by Grid; presentation-only — the parent owns the visibility set.
  let {
    columns,
    hidden,
    x,
    y,
    onToggle,
    onShowAll,
    onClose,
  }: {
    columns: Array<{ key: string; header: string }>;
    hidden: string[];
    x: number;
    y: number;
    onToggle: (key: string) => void;
    onShowAll: () => void;
    onClose: () => void;
  } = $props();

  let search = $state('');
  const shown = $derived(
    columns.filter((c) => c.header.toLowerCase().includes(search.trim().toLowerCase())),
  );
</script>

<div
  class="bo-toolpanel"
  role="dialog"
  tabindex="-1"
  aria-label="Columns"
  style="left:{x}px;top:{y}px;"
  onpointerdown={(e) => e.stopPropagation()}
  onkeydown={(e) => e.key === 'Escape' && onClose()}
>
  <div class="bo-tp-head">
    <span>Columns</span>
    <button type="button" class="bo-tp-link" onclick={onShowAll}>Show all</button>
  </div>
  <input class="bo-tp-search" type="search" bind:value={search} placeholder="search…" aria-label="Search columns" />
  <div class="bo-tp-list">
    {#each shown as col (col.key)}
      <label class="bo-tp-opt">
        <input type="checkbox" checked={!hidden.includes(col.key)} onchange={() => onToggle(col.key)} />
        <span>{col.header}</span>
      </label>
    {/each}
  </div>
</div>

<style>
  .bo-toolpanel {
    position: fixed;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 7px;
    width: 200px;
    padding: 10px;
    background: var(--bo-header-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    font-size: 12px;
    color: var(--bo-text);
  }
  .bo-tp-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    font-weight: 600;
    color: var(--bo-text-dim);
  }
  .bo-tp-link {
    padding: 0;
    font: inherit;
    font-size: 11px;
    color: var(--bo-up);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .bo-tp-link:hover {
    text-decoration: underline;
  }
  .bo-tp-search {
    width: 100%;
    padding: 5px 7px;
    font: inherit;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 5px;
  }
  .bo-tp-list {
    display: flex;
    flex-direction: column;
    max-height: 220px;
    overflow-y: auto;
  }
  .bo-tp-opt {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 4px;
    cursor: pointer;
    white-space: nowrap;
  }
  .bo-tp-opt:hover {
    background: var(--bo-row-hover);
  }
  .bo-tp-opt span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
