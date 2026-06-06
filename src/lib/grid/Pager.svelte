<script lang="ts">
  // Pagination bar for the grid. Presentation-only: the parent owns the page
  // state and reorders via `onGoto`.
  let {
    page,
    pageCount,
    total,
    onGoto,
  }: {
    page: number;
    pageCount: number;
    total: number;
    onGoto: (page: number) => void;
  } = $props();
</script>

<div class="pager" role="navigation" aria-label="Pagination">
  <button type="button" class="pg" disabled={page === 0} aria-label="First page" onclick={() => onGoto(0)}>«</button>
  <button type="button" class="pg" disabled={page === 0} onclick={() => onGoto(page - 1)}>‹ Prev</button>
  <span class="pageinfo">Page {page + 1} of {pageCount} · {total.toLocaleString()} rows</span>
  <button type="button" class="pg" disabled={page >= pageCount - 1} onclick={() => onGoto(page + 1)}>Next ›</button>
  <button type="button" class="pg" disabled={page >= pageCount - 1} aria-label="Last page" onclick={() => onGoto(pageCount - 1)}>»</button>
</div>

<style>
  .pager {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: var(--bo-header-bg);
    border-top: 0.5px solid var(--bo-border);
  }
  .pg {
    padding: 3px 9px;
    font: inherit;
    font-family: var(--bo-mono);
    font-size: 11px;
    color: var(--bo-text);
    background: transparent;
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
    cursor: pointer;
  }
  .pg:hover:not(:disabled) {
    background: var(--bo-row-hover);
    border-color: var(--bo-sel-border);
  }
  .pg:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  .pageinfo {
    font-family: var(--bo-mono);
    font-size: 11px;
    color: var(--bo-text-dim);
    font-variant-numeric: tabular-nums;
  }
</style>
