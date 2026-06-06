<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A plain, non-financial dataset — a team roster — to show the grid is a
  // general-purpose data grid: inline edit, clipboard copy/paste, drag-to-resize,
  // on a light theme.
  interface Member extends GridRow {
    name: string;
    role: string;
    team: string;
    salary: number;
    bonus: number;
    rating: number;
    startDate: number;
  }

  const FIRST = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ravi', 'Yuki', 'Omar', 'Lena', 'Theo', 'Ines', 'Kai'];
  const LAST = ['Chen', 'Patel', 'Kim', 'Garcia', 'Nguyen', 'Haddad', 'Rossi', 'Silva', 'Okafor', 'Novak'];
  const ROLES = ['Engineer', 'Designer', 'PM', 'Analyst', 'Researcher', 'Writer'];
  const TEAMS = ['Platform', 'Growth', 'Design', 'Data', 'Infra'];
  const BASE = Date.UTC(2018, 0, 1);

  function buildRoster(count: number): Member[] {
    const out: Member[] = [];
    for (let id = 0; id < count; id++) {
      const name = `${FIRST[(id * 7) % FIRST.length]} ${LAST[(id * 13) % LAST.length]}`;
      const salary = 80_000 + ((id * 2137) % 90) * 1_000;
      out.push({
        id,
        flashSeq: 0,
        flashDir: 'up',
        name,
        role: ROLES[(id * 5) % ROLES.length],
        team: TEAMS[(id * 3) % TEAMS.length],
        salary,
        bonus: Math.round((salary * (5 + ((id * 11) % 20))) / 100),
        rating: Math.round((3 + ((id * 17) % 20) / 10) * 10) / 10,
        startDate: BASE + ((id * 53) % 2200) * 86_400_000,
      });
    }
    return out;
  }

  const rows = $state<Member[]>(buildRoster(60));
  const gridRows = $derived(rows as unknown as GridRow[]);

  // Every column resizable (the default); salary/bonus/rating editable.
  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name', width: 160, tooltip: true },
    { type: 'text', key: 'role', header: 'Role', width: 130, editable: true, options: ROLES, compare: (a, b) => ROLES.indexOf(String(a)) - ROLES.indexOf(String(b)) },
    { type: 'text', key: 'team', header: 'Team', width: 120, cellClass: 'team-cell', headerClass: 'team-head' },
    { type: 'number', key: 'salary', header: 'Salary', width: 116, minWidth: 90, maxWidth: 200, decimals: 0, editable: true, format: (v) => `$${Number(v).toLocaleString()}` },
    { type: 'number', key: 'bonus', header: 'Bonus', width: 108, decimals: 0, editable: true },
    { type: 'number', key: 'rating', header: 'Rating', width: 92, decimals: 1, editable: true, cellClass: (v) => (Number(v) >= 4.5 ? 'rating-hot' : '') },
    { type: 'date', key: 'startDate', header: 'Start date', width: 120, dateStyle: 'short' },
  ];

  let filterText = $state('');
  let selectedCount = $state(0);
  let lastCell = $state('');
  let pageMode = $state(false);

  // Column show/hide: a controlled list of hidden keys + a little picker menu.
  let hidden = $state<string[]>([]);
  let menuOpen = $state(false);
  const toggleCol = (key: string) =>
    (hidden = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);

  // Close the picker when clicking outside it.
  $effect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.colmenu')) menuOpen = false;
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  });
</script>

<div class="controls">
  <input
    class="filter"
    type="search"
    placeholder="Filter people…"
    bind:value={filterText}
    aria-label="Filter rows"
  />
  <div class="colmenu">
    <button
      class="colbtn"
      class:on={menuOpen}
      aria-haspopup="true"
      aria-expanded={menuOpen}
      onclick={(e) => {
        e.stopPropagation();
        menuOpen = !menuOpen;
      }}
    >
      Columns{#if hidden.length}<span class="badge">{columns.length - hidden.length}/{columns.length}</span>{/if} ▾
    </button>
    {#if menuOpen}
      <div class="menu" role="menu">
        {#each columns as col (col.key)}
          <label class="item">
            <input
              type="checkbox"
              checked={!hidden.includes(col.key)}
              onchange={() => toggleCol(col.key)}
            />
            {col.header}
          </label>
        {/each}
      </div>
    {/if}
  </div>
  <span class="hint">
    Tick rows to select · double-click a number to edit · drag a header edge to resize ·
    <kbd>Ctrl/⌘+C</kbd> / <kbd>V</kbd> to copy &amp; paste
  </span>
  <button class="colbtn" class:on={pageMode} onclick={() => (pageMode = !pageMode)}>
    {pageMode ? 'Paged' : 'Scroll'}
  </button>
  {#if selectedCount > 0}
    <span class="count">{selectedCount} selected</span>
  {/if}
  {#if lastCell}
    <span class="lastcell">clicked: {lastCell}</span>
  {/if}
</div>

{#snippet detailPanel({ row }: { row: GridRow })}
  <div class="detail">
    <strong>{row.name}</strong> — {row.role}, {row.team}
    <div class="detail-grid">
      <span>Salary <b>${Number(row.salary).toLocaleString()}</b></span>
      <span>Bonus <b>${Number(row.bonus).toLocaleString()}</b></span>
      <span>Rating <b>{row.rating}</b></span>
    </div>
  </div>
{/snippet}

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    filter={filterText}
    hiddenColumns={hidden}
    filterRow
    quickFilter
    emptyMessage="No people match your filters"
    theme={ui.theme}
    persistKey="demo-sheet"
    height={620}
    rowSelection
    getRowId={(r) => `emp-${r.id}`}
    onRowSelectionChange={(ids) => (selectedCount = ids.length)}
    onCellClick={({ column, value }) => (lastCell = `${column.header} = ${value}`)}
    onCellEdit={(e) => ((e.row as Record<string, unknown>)[e.column.key] = e.value)}
    detail={detailPanel}
    detailHeight={84}
    pageSize={pageMode ? 12 : 0}
  />
</div>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
  }
  .filter {
    width: 180px;
    padding: 5px 12px;
    font-family: var(--mono);
    font-size: 12px;
    color: #1a1a1a;
    background: #fff;
    border: 1px solid #d2d6dc;
    border-radius: 999px;
    outline: none;
  }
  .filter:focus {
    border-color: #6366f1;
  }
  .hint {
    color: var(--text-dim);
  }
  .count {
    padding: 3px 10px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 600;
    color: #312e81;
    background: #e0e7ff;
    border-radius: 999px;
  }
  .lastcell {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
  }
  .colmenu {
    position: relative;
  }
  .colbtn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    font-family: var(--mono);
    font-size: 12px;
    color: #1a1a1a;
    background: #fff;
    border: 1px solid #d2d6dc;
    border-radius: 999px;
    cursor: pointer;
  }
  .colbtn.on {
    border-color: #6366f1;
  }
  .colbtn .badge {
    font-size: 10px;
    color: #6366f1;
  }
  .menu {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 20;
    min-width: 160px;
    padding: 6px;
    background: #fff;
    border: 1px solid #d2d6dc;
    border-radius: 10px;
    box-shadow: 0 8px 28px rgba(20, 20, 40, 0.16);
  }
  .menu .item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    font-size: 12px;
    color: #1a1a1a;
    border-radius: 6px;
    cursor: pointer;
  }
  .menu .item:hover {
    background: #f1f2f6;
  }
  .hint kbd {
    padding: 1px 5px;
    font-family: var(--mono);
    font-size: 10px;
    color: var(--text);
    background: rgba(255, 255, 255, 0.06);
    border: 0.5px solid var(--border);
    border-radius: 4px;
  }
  .gridwrap {
    max-width: 900px;
  }
  .detail {
    padding: 12px 16px;
    font-size: 13px;
    color: #1a1a1a;
  }
  .detail-grid {
    display: flex;
    gap: 24px;
    margin-top: 8px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .detail-grid b {
    color: #1a1a1a;
  }
  /* Per-column class hooks (cellClass / headerClass). */
  :global(.bo-grid .h.team-head) {
    color: #6366f1;
  }
  :global(.bo-grid .c.team-cell) {
    color: #4f46e5;
  }
  :global(.bo-grid .c.rating-hot) {
    font-weight: 700;
    color: #b45309;
  }
</style>
