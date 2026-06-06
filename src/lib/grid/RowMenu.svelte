<script lang="ts">
  // Floating right-click row menu. Presentation-only: the parent owns open/close
  // state and positions it via x/y.
  let {
    x,
    y,
    items,
    onClose,
  }: {
    x: number;
    y: number;
    items: Array<{ label: string; onSelect: () => void }>;
    onClose: () => void;
  } = $props();
</script>

<div
  class="rowmenu"
  role="menu"
  tabindex="-1"
  style="left:{x}px;top:{y}px;"
  onpointerdown={(e) => e.stopPropagation()}
>
  {#each items as item (item.label)}
    <button
      class="rowmenu-item"
      type="button"
      role="menuitem"
      onclick={() => {
        item.onSelect();
        onClose();
      }}
    >
      {item.label}
    </button>
  {/each}
</div>

<style>
  .rowmenu {
    position: fixed;
    z-index: 20;
    min-width: 150px;
    padding: 4px;
    background: var(--bo-header-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  }
  .rowmenu-item {
    display: block;
    width: 100%;
    padding: 6px 10px;
    font: inherit;
    font-size: 12px;
    text-align: left;
    color: var(--bo-text);
    background: transparent;
    border: 0;
    border-radius: 5px;
    cursor: pointer;
  }
  .rowmenu-item:hover {
    background: var(--bo-row-hover);
  }
</style>
