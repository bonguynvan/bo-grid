<script lang="ts">
  // Find in grid (`findBar`), lazy-loaded on first Ctrl/⌘+F. Matches the cells'
  // displayed text, case-insensitively, and steps through them; the grid owns
  // focus and scrolling (`onGo`). Matches are scanned once per query or view,
  // never per tick: on a live board the values move under the matches, which
  // is fine for a find.
  import { untrack } from 'svelte';
  import { formatCell, cellValue, type ColumnDef } from './column';
  import type { VisualRow } from './grouping';
  import type { GridLabels } from './labels';

  let {
    request,
    rows,
    columns,
    labels,
    getFocus,
    onGo,
    onClose,
  }: {
    /** Bumped on every open: `query` searches at once, `n` refocuses the input. */
    request: { query?: string; n: number };
    /** The grid's visual rows (data, group headers, loading rows), in view order. */
    rows: readonly VisualRow[];
    columns: readonly ColumnDef[];
    labels: GridLabels;
    getFocus: () => { r: number; c: number } | null;
    onGo: (r: number, c: number) => void;
    onClose: () => void;
  } = $props();

  const CAP = 10_000;
  let query = $state('');
  let index = $state(-1);
  let input: HTMLInputElement | undefined = $state();

  const matches = $derived.by((): { r: number; c: number }[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const list = rows;
    const cs = columns;
    return untrack(() => {
      const out: { r: number; c: number }[] = [];
      for (let r = 0; r < list.length && out.length < CAP; r++) {
        const it = list[r];
        if (it.kind !== 'data') continue;
        for (let c = 0; c < cs.length; c++) {
          if (cs[c].type === 'sparkline') continue;
          if (formatCell(cs[c], cellValue(cs[c], it.row), it.row).toLowerCase().includes(q)) out.push({ r, c });
        }
      }
      return out;
    });
  });
  const countText = $derived(
    !query.trim()
      ? ''
      : matches.length === 0
        ? labels.findNone
        : labels.findCount(index + 1, matches.length) + (matches.length >= CAP ? '+' : ''),
  );

  function go(i: number) {
    index = i;
    const m = matches[i];
    if (m) onGo(m.r, m.c);
  }
  // The first match at or after the focused cell: a fresh query starts there.
  function fromFocus() {
    index = -1;
    const m = matches;
    if (m.length === 0) return;
    const f = getFocus();
    const at = f ? m.findIndex((x) => x.r > f.r || (x.r === f.r && x.c >= f.c)) : 0;
    go(at < 0 ? 0 : at);
  }
  function step(dir: 1 | -1) {
    const n = matches.length;
    if (n === 0) return;
    go(index < 0 ? (dir > 0 ? 0 : n - 1) : (index + dir + n) % n);
  }
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      step(e.shiftKey ? -1 : 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  // Every open: search for its query (if any) and put focus in the input.
  $effect(() => {
    const req = request;
    untrack(() => {
      if (req.query != null) {
        query = req.query;
        fromFocus();
      }
      input?.focus();
      input?.select();
    });
  });
</script>

<div class="bo-find" role="search">
  <input
    bind:this={input}
    type="search"
    aria-label={labels.find}
    placeholder={labels.find}
    value={query}
    oninput={(e) => {
      query = e.currentTarget.value;
      fromFocus();
    }}
    onkeydown={onKey}
  />
  <span class="bo-find-count" aria-live="polite">{countText}</span>
  <button type="button" aria-label={labels.findPrevious} onclick={() => step(-1)}>↑</button>
  <button type="button" aria-label={labels.findNext} onclick={() => step(1)}>↓</button>
  <button type="button" aria-label={labels.findClose} onclick={onClose}>✕</button>
</div>

<style>
  /* Floats over the top-right of the grid, beside (not inside) the grid role. */
  .bo-find {
    position: absolute;
    top: 6px;
    right: 10px;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    font-size: 12px;
    color: var(--bo-text);
    background: var(--bo-header-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  }
  input {
    width: 180px;
    padding: 3px 6px;
    font: inherit;
    color: var(--bo-text);
    background: var(--bo-bg);
    border: 0.5px solid var(--bo-border);
    border-radius: 4px;
    outline: none;
  }
  input:focus-visible {
    border-color: var(--bo-sel-border);
  }
  .bo-find-count {
    min-width: 64px;
    font-variant-numeric: tabular-nums;
    color: var(--bo-text-dim);
    text-align: center;
  }
  button {
    width: 22px;
    height: 22px;
    padding: 0;
    font: inherit;
    line-height: 1;
    color: var(--bo-text-dim);
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;
  }
  button:hover,
  button:focus-visible {
    color: var(--bo-text);
    background: var(--bo-row-hover);
  }
</style>
