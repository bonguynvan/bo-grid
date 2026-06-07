<script lang="ts">
  import { Grid, parseCSV, parseTSV, parseJSON, parseRows, toCSV, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // Round-trip import: parse CSV / TSV / JSON text → rows, and export rows → CSV.
  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name', flex: 1, minWidth: 160 },
    { type: 'text', key: 'role', header: 'Role', width: 140 },
    { type: 'number', key: 'salary', header: 'Salary', width: 120, decimals: 0, format: (v) => `$${Number(v).toLocaleString()}` },
    { type: 'number', key: 'rating', header: 'Rating', width: 100, decimals: 1 },
  ];

  type Fmt = 'auto' | 'csv' | 'tsv' | 'json';
  const SAMPLES: Record<'csv' | 'tsv' | 'json', string> = {
    csv: `Name,Role,Salary,Rating
Ada Lovelace,Engineer,142000,4.9
"Grace Hopper, Jr.",Architect,158000,4.8
Alan Turing,Researcher,150000,5
Katherine Johnson,Analyst,138000,4.7`,
    tsv: `Name\tRole\tSalary\tRating
Ada Lovelace\tEngineer\t142000\t4.9
Grace Hopper\tArchitect\t158000\t4.8
Alan Turing\tResearcher\t150000\t5`,
    json: JSON.stringify(
      [
        { name: 'Ada Lovelace', role: 'Engineer', salary: 142000, rating: 4.9 },
        { name: 'Grace Hopper', role: 'Architect', salary: 158000, rating: 4.8 },
        { name: 'Alan Turing', role: 'Researcher', salary: 150000, rating: 5 },
      ],
      null,
      2,
    ),
  };

  let format = $state<Fmt>('csv');
  let text = $state(SAMPLES.csv);
  let rows = $state<GridRow[]>(parseCSV(SAMPLES.csv, columns));

  function setFormat(f: Fmt) {
    format = f;
    if (f !== 'auto') text = SAMPLES[f]; // 'auto' parses whatever's in the box
  }
  function load() {
    rows =
      format === 'auto'
        ? parseRows(text, columns)
        : format === 'tsv'
          ? parseTSV(text, columns)
          : format === 'json'
            ? parseJSON(text)
            : parseCSV(text, columns);
  }
  function exportText() {
    setFormat('csv');
    text = toCSV(rows, columns);
  }
</script>

<div class="controls">
  <select class="csv-format" aria-label="Import format" onchange={(e) => setFormat(e.currentTarget.value as Fmt)}>
    <option value="csv" selected={format === 'csv'}>CSV</option>
    <option value="tsv" selected={format === 'tsv'}>TSV</option>
    <option value="json" selected={format === 'json'}>JSON</option>
    <option value="auto" selected={format === 'auto'}>Auto-detect</option>
  </select>
  <button class="btn primary csv-load" type="button" onclick={load}>↑ Load → grid</button>
  <button class="btn" type="button" onclick={exportText}>↓ Export grid → CSV</button>
  <span class="hint">Edit the {format.toUpperCase()} and Load it (quotes/commas/tabs handled), or Export back to CSV.</span>
</div>

<div class="io">
  <textarea class="csv-text" bind:value={text} spellcheck="false" aria-label="Import text"></textarea>
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
  .btn:focus-visible,
  .csv-format:focus-visible {
    outline: 2px solid var(--up);
    outline-offset: 2px;
  }
  .csv-format {
    padding: 5px 8px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
    background: var(--header-bg);
    border: 0.5px solid var(--border);
    border-radius: 7px;
    cursor: pointer;
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
