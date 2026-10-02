<script lang="ts">
  import type { GridLabels } from './labels';
  // Pagination bar for the grid. Presentation-only: the parent owns the page
  // state and reorders via `onGoto`.
  let {
    page,
    pageCount,
    total,
    onGoto,
    pageSize,
    pageSizeOptions,
    onPageSize,
    labels,
    locale,
  }: {
    page: number;
    pageCount: number;
    total: number;
    onGoto: (page: number) => void;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageSize?: (size: number) => void;
    labels: GridLabels;
    locale?: string;
  } = $props();

  const showSizes = $derived(!!pageSizeOptions && pageSizeOptions.length > 0);
</script>

<div class="pager" role="navigation" aria-label={labels.pagination}>
  <button type="button" class="pg" disabled={page === 0} aria-label={labels.firstPage} onclick={() => onGoto(0)}>«</button>
  <button type="button" class="pg" disabled={page === 0} onclick={() => onGoto(page - 1)}>{labels.previous}</button>
  <span class="pageinfo">{labels.pageOf(page + 1, pageCount, total, locale)}</span>
  <button type="button" class="pg" disabled={page >= pageCount - 1} onclick={() => onGoto(page + 1)}>{labels.next}</button>
  <button type="button" class="pg" disabled={page >= pageCount - 1} aria-label={labels.lastPage} onclick={() => onGoto(pageCount - 1)}>»</button>
  {#if showSizes}
    <label class="pgsize">
      {labels.rows}
      <select
        aria-label={labels.rowsPerPage}
        value={pageSize}
        onchange={(e) => onPageSize?.(Number((e.currentTarget as HTMLSelectElement).value))}
      >
        {#each pageSizeOptions as opt (opt)}
          <option value={opt}>{opt}</option>
        {/each}
      </select>
    </label>
  {/if}
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
  .pg:focus-visible {
    outline: 2px solid var(--bo-sel-border);
    outline-offset: 1px;
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
  .pgsize {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-left: auto;
    font-family: var(--bo-mono);
    font-size: 11px;
    color: var(--bo-text-dim);
  }
  .pgsize select {
    font: inherit;
    font-size: 11px;
    color: var(--bo-text);
    background: transparent;
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
    padding: 2px 4px;
    cursor: pointer;
  }
  .pgsize select:focus-visible {
    outline: 2px solid var(--bo-sel-border);
    outline-offset: 1px;
  }
</style>
