<script lang="ts">
  // Floating header filter menu. Lazy-loaded by Grid (dynamic import) so it
  // stays out of the core bundle until a filter is opened. Presentation-only:
  // the parent owns open/close + position and applies the resulting filter.
  import { untrack } from 'svelte';
  import {
    isFilterActive,
    type ColumnFilter,
    type FilterKind,
    type TextOp,
    type NumberOp,
    type DateOp,
  } from './filtering';

  let {
    kind,
    header,
    filter,
    values = [],
    x,
    y,
    onApply,
    onClose,
  }: {
    kind: FilterKind;
    header: string;
    filter: ColumnFilter | null;
    /** Distinct column values for a set filter's checklist. */
    values?: string[];
    x: number;
    y: number;
    onApply: (f: ColumnFilter | null) => void;
    onClose: () => void;
  } = $props();

  const TEXT_OPS: Array<{ op: TextOp; label: string }> = [
    { op: 'contains', label: 'Contains' },
    { op: 'notContains', label: 'Not contains' },
    { op: 'equals', label: 'Equals' },
    { op: 'starts', label: 'Starts with' },
    { op: 'ends', label: 'Ends with' },
  ];
  const NUMBER_OPS: Array<{ op: NumberOp; label: string }> = [
    { op: 'eq', label: '=' },
    { op: 'ne', label: '≠' },
    { op: 'lt', label: '<' },
    { op: 'le', label: '≤' },
    { op: 'gt', label: '>' },
    { op: 'ge', label: '≥' },
    { op: 'between', label: 'Between' },
  ];
  const DATE_OPS: Array<{ op: DateOp; label: string }> = [
    { op: 'on', label: 'On' },
    { op: 'before', label: 'Before' },
    { op: 'after', label: 'After' },
    { op: 'between', label: 'Between' },
  ];

  const toMs = (s: string): number => (s ? Date.parse(`${s}T00:00:00Z`) : NaN);
  const toDateInput = (ms: number): string =>
    Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : '';

  // Local draft, seeded once from the active filter. The menu is recreated each
  // time it opens, so capturing the initial prop value (not tracking it) is what
  // we want.
  const init = untrack(() => filter);
  let textOp = $state<TextOp>(init?.kind === 'text' ? init.op : 'contains');
  let textQ = $state(init?.kind === 'text' ? init.q : '');
  let numOp = $state<NumberOp>(init?.kind === 'number' ? init.op : 'eq');
  let numA = $state<number | null>(init?.kind === 'number' && Number.isFinite(init.a) ? init.a : null);
  let numB = $state<number | null>(
    init?.kind === 'number' && init.b != null && Number.isFinite(init.b) ? init.b : null,
  );
  let dateOp = $state<DateOp>(init?.kind === 'date' ? init.op : 'on');
  let dateA = $state(init?.kind === 'date' ? toDateInput(init.a) : '');
  let dateB = $state(init?.kind === 'date' && init.b != null ? toDateInput(init.b) : '');
  // Set filter: track the *excluded* values (unchecked boxes).
  let excluded = $state(new Set<string>(init?.kind === 'set' ? init.excluded : []));
  let search = $state('');
  const shown = $derived(values.filter((v) => v.toLowerCase().includes(search.trim().toLowerCase())));
  function toggleVal(v: string) {
    const n = new Set(excluded);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    excluded = n;
  }

  function build(): ColumnFilter | null {
    let f: ColumnFilter;
    if (kind === 'number') {
      f = { kind: 'number', op: numOp, a: numA ?? NaN, b: numB ?? undefined };
    } else if (kind === 'date') {
      f = { kind: 'date', op: dateOp, a: toMs(dateA), b: dateB ? toMs(dateB) : undefined };
    } else if (kind === 'set') {
      f = { kind: 'set', excluded: [...excluded] };
    } else {
      f = { kind: 'text', op: textOp, q: textQ };
    }
    return isFilterActive(f) ? f : null;
  }

  function apply() {
    onApply(build());
  }
  function clear() {
    onApply(null);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') apply();
    else if (e.key === 'Escape') onClose();
  }
</script>

<div
  class="bo-filtermenu"
  role="dialog"
  tabindex="-1"
  aria-label="Filter {header}"
  style="left:{x}px;top:{y}px;"
  onpointerdown={(e) => e.stopPropagation()}
  onkeydown={onKey}
>
  <div class="bo-fm-head">{header}</div>

  {#if kind === 'number'}
    <select class="bo-fm-op" bind:value={numOp} aria-label="Operator">
      {#each NUMBER_OPS as o (o.op)}<option value={o.op}>{o.label}</option>{/each}
    </select>
    <input class="bo-fm-in" type="number" bind:value={numA} placeholder="value" aria-label="Value" />
    {#if numOp === 'between'}
      <input class="bo-fm-in" type="number" bind:value={numB} placeholder="and" aria-label="Upper value" />
    {/if}
  {:else if kind === 'date'}
    <select class="bo-fm-op" bind:value={dateOp} aria-label="Operator">
      {#each DATE_OPS as o (o.op)}<option value={o.op}>{o.label}</option>{/each}
    </select>
    <input class="bo-fm-in" type="date" bind:value={dateA} aria-label="Date" />
    {#if dateOp === 'between'}
      <input class="bo-fm-in" type="date" bind:value={dateB} aria-label="End date" />
    {/if}
  {:else if kind === 'set'}
    <input class="bo-fm-in" type="search" bind:value={search} placeholder="search…" aria-label="Search values" />
    <div class="bo-fm-setbar">
      <button type="button" class="bo-fm-link" onclick={() => (excluded = new Set())}>All</button>
      <button type="button" class="bo-fm-link" onclick={() => (excluded = new Set(values))}>None</button>
    </div>
    <div class="bo-fm-list">
      {#each shown as v (v)}
        <label class="bo-fm-opt">
          <input type="checkbox" checked={!excluded.has(v)} onchange={() => toggleVal(v)} />
          <span>{v === '' ? '(blank)' : v}</span>
        </label>
      {/each}
    </div>
  {:else}
    <select class="bo-fm-op" bind:value={textOp} aria-label="Operator">
      {#each TEXT_OPS as o (o.op)}<option value={o.op}>{o.label}</option>{/each}
    </select>
    <!-- svelte-ignore a11y_autofocus -->
    <input class="bo-fm-in" type="text" bind:value={textQ} placeholder="filter…" aria-label="Value" autofocus />
  {/if}

  <div class="bo-fm-actions">
    <button class="bo-fm-btn" type="button" onclick={clear}>Clear</button>
    <button class="bo-fm-btn bo-fm-apply" type="button" onclick={apply}>Apply</button>
  </div>
</div>

<style>
  .bo-filtermenu {
    position: fixed;
    z-index: 30;
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 200px;
    padding: 10px;
    background: var(--bo-header-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    font-size: 12px;
    color: var(--bo-text);
  }
  .bo-fm-head {
    font-weight: 600;
    color: var(--bo-text-dim);
    padding-bottom: 2px;
  }
  .bo-fm-op,
  .bo-fm-in {
    width: 100%;
    padding: 5px 7px;
    font: inherit;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 5px;
  }
  .bo-fm-setbar {
    display: flex;
    gap: 12px;
  }
  .bo-fm-link {
    padding: 0;
    font: inherit;
    font-size: 11px;
    color: var(--bo-up);
    background: none;
    border: 0;
    cursor: pointer;
  }
  .bo-fm-link:hover {
    text-decoration: underline;
  }
  .bo-fm-list {
    display: flex;
    flex-direction: column;
    max-height: 180px;
    overflow-y: auto;
    border: 0.5px solid var(--bo-border);
    border-radius: 5px;
  }
  .bo-fm-opt {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 4px 7px;
    cursor: pointer;
    white-space: nowrap;
  }
  .bo-fm-opt:hover {
    background: var(--bo-row-hover);
  }
  .bo-fm-opt span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .bo-fm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 2px;
  }
  .bo-fm-btn {
    padding: 5px 12px;
    font: inherit;
    font-size: 11px;
    color: var(--bo-text-dim);
    background: transparent;
    border: 0.5px solid var(--bo-border);
    border-radius: 5px;
    cursor: pointer;
  }
  .bo-fm-btn:hover {
    color: var(--bo-text);
  }
  /* Visible keyboard focus (WCAG 2.4.7) for the menu's custom buttons. */
  .bo-fm-btn:focus-visible,
  .bo-fm-link:focus-visible {
    outline: 2px solid var(--bo-sel-border);
    outline-offset: 1px;
    border-radius: 5px;
  }
  .bo-fm-apply {
    color: #0a0a0a;
    background: var(--bo-up);
    border-color: var(--bo-up);
  }
</style>
