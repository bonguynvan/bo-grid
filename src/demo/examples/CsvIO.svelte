<script lang="ts">
  import { Grid, parseCSV, toCSV, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // CSV round-trip: parse text → rows, and export rows → text. Edit the CSV and
  // Load it, or Export the current grid back to CSV.
  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name', flex: 1, minWidth: 160 },
    { type: 'text', key: 'role', header: 'Role', width: 140 },
    { type: 'number', key: 'salary', header: 'Salary', width: 120, decimals: 0, format: (v) => `$${Number(v).toLocaleString()}` },
    { type: 'number', key: 'rating', header: 'Rating', width: 100, decimals: 1 },
  ];

  const SAMPLE = `Name,Role,Salary,Rating
Ada Lovelace,Engineer,142000,4.9
"Grace Hopper, Jr.",Architect,158000,4.8
Alan Turing,Researcher,150000,5
Katherine Johnson,Analyst,138000,4.7`;

  let csvText = $state(SAMPLE);
  let rows = $state<GridRow[]>(parseCSV(SAMPLE, columns));

  function load() {
    rows = parseCSV(csvText, columns);
  }
  function exportText() {
    csvText = toCSV(rows, columns);
  }
</script>

<div class="controls">
  <button class="btn primary csv-load" type="button" onclick={load}>↑ Load CSV → grid</button>
  <button class="btn" type="button" onclick={exportText}>↓ Export grid → CSV</button>
  <span class="hint">Edit the CSV (quotes, commas handled) and Load it, or Export the grid back to CSV.</span>
</div>

<div class="io">
  <textarea class="csv-text" bind:value={csvText} spellcheck="false" aria-label="CSV text"></textarea>
  <div class="gridwrap">
    <Grid {rows} {columns} theme={ui.theme} height={260} ariaLabel="CSV data" />
  </div>
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .btn {
    padding: 5px 12px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 7px;
    cursor: pointer;
  }
  .btn:hover {
    color: var(--text);
  }
  .btn.primary {
    color: #0a0a0a;
    background: var(--up);
    border-color: var(--up);
  }
  .btn:focus-visible {
    outline: 2px solid var(--up);
    outline-offset: 2px;
  }
  .hint {
    color: var(--text-dim);
  }
  .io {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 14px;
    max-width: 920px;
  }
  .csv-text {
    height: 260px;
    padding: 10px 12px;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 1.6;
    color: var(--text);
    background: var(--header-bg);
    border: 0.5px solid var(--border);
    border-radius: 10px;
    resize: vertical;
  }
  .csv-text:focus-visible {
    outline: 2px solid var(--up);
    outline-offset: 1px;
  }
  @media (max-width: 720px) {
    .io {
      grid-template-columns: 1fr;
    }
  }
</style>
