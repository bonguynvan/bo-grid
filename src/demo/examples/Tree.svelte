<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A file-explorer tree: folders expand to reveal children. Demonstrates
  // tree-data (getChildren), the indented first column with expand chevrons, and
  // per-row colouring of folders vs files.
  interface Node extends GridRow {
    name: string;
    kind: 'folder' | 'file';
    size: number;
    children?: Node[];
  }

  let nextId = 0;
  function folder(name: string, children: Node[]): Node {
    const size = children.reduce((a, c) => a + c.size, 0);
    return { id: nextId++, flashSeq: 0, flashDir: 'up', name, kind: 'folder', size, children };
  }
  function file(name: string, size: number): Node {
    return { id: nextId++, flashSeq: 0, flashDir: 'up', name, kind: 'file', size };
  }

  const roots: Node[] = [
    folder('src', [
      folder('grid', [
        file('Grid.svelte', 41_200),
        file('Cell.svelte', 9_800),
        file('column.ts', 5_100),
        folder('util', [file('sizing.ts', 1_400), file('tree.ts', 1_100)]),
      ]),
      folder('sparkline', [file('Sparkline.svelte', 2_100), file('render.ts', 1_700)]),
      file('index.ts', 2_600),
    ]),
    folder('scripts', [file('release.mjs', 3_300), file('smoke.mjs', 9_400)]),
    file('package.json', 2_200),
    file('README.md', 14_800),
  ];

  const rows = $state<Node[]>(roots);
  const gridRows = $derived(rows as unknown as GridRow[]);

  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name', flex: 1, sortable: false },
    { type: 'text', key: 'kind', header: 'Type', width: 90, sortable: false },
    { type: 'volume', key: 'size', header: 'Size', width: 100, sortable: false },
  ];
</script>

<div class="controls">
  <span class="stat">File-explorer tree · click ▸ to expand folders</span>
</div>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme={ui.theme}
    height={520}
    getChildren={(r) => (r as Node).children}
    rowClass={(r) => ((r as Node).kind === 'folder' ? 'folder-row' : '')}
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
  :global(.bo-grid .row.folder-row .text strong) {
    color: var(--up);
  }
</style>
