<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A drag-to-reorder task list. Grab the ⠿ handle in the first column and drop a
  // row onto another to reorder. The grid is presentation-only, so onRowReorder
  // just hands back the indices and we reorder our own array.
  interface Task extends GridRow {
    title: string;
    owner: string;
    priority: string;
  }

  const SEED: Array<[string, string, string]> = [
    ['Wire up auth flow', 'Ava', 'High'],
    ['Design empty states', 'Mia', 'Medium'],
    ['Fix pager off-by-one', 'Noah', 'High'],
    ['Write API docs', 'Zoe', 'Low'],
    ['Add dark theme', 'Kai', 'Medium'],
    ['Profile slow query', 'Ravi', 'High'],
    ['Ship release notes', 'Lena', 'Low'],
  ];
  let tasks = $state<Task[]>(
    SEED.map(([title, owner, priority], i) => ({ id: i, flashSeq: 0, flashDir: 'up', title, owner, priority })),
  );
  const gridRows = $derived(tasks as unknown as GridRow[]);

  const columns: ColumnDef[] = [
    { type: 'text', key: 'title', header: 'Task', flex: 1, sortable: false },
    { type: 'text', key: 'owner', header: 'Owner', width: 110, sortable: false },
    { type: 'text', key: 'priority', header: 'Priority', width: 100, sortable: false },
  ];

  function reorder(from: number, to: number): void {
    const next = [...tasks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    tasks = next; // new array reference so the grid re-renders the new order
  }
</script>

<div class="controls">
  <span class="stat">Drag the ⠿ handle to reorder tasks</span>
</div>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme={ui.theme}
    height={tasks.length * 36 + 40}
    onRowReorder={reorder}
  />
</div>

<style>
  .controls {
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .gridwrap {
    max-width: 620px;
  }
</style>
