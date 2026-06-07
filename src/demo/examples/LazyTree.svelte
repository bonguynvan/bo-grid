<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A server-backed file tree: children load lazily on expand (simulated ~280ms
  // latency) with a loading row, then cache. `hasChildren` shows the chevron
  // without loading; `loadChildren` fetches on demand.
  interface FsNode extends GridRow {
    name: string;
    kind: 'folder' | 'file';
    size: string;
    depth: number;
  }

  let nextId = 1000;
  function make(name: string, kind: 'folder' | 'file', size: string, depth: number): FsNode {
    return { id: nextId++, flashSeq: 0, flashDir: 'up', name, kind, size, depth };
  }

  const roots: FsNode[] = [
    make('src', 'folder', '—', 0),
    make('node_modules', 'folder', '—', 0),
    make('docs', 'folder', '—', 0),
    make('package.json', 'file', '2 KB', 0),
    make('README.md', 'file', '8 KB', 0),
  ];
  const rows = $state<GridRow[]>(roots as unknown as GridRow[]);

  // Simulated server: build a node's children based on its name + depth.
  function childrenOf(node: FsNode): FsNode[] {
    const count = 2 + ((node.name.length + node.depth) % 4);
    return Array.from({ length: count }, (_, i) => {
      const folder = node.depth < 3 && i % 2 === 0;
      const base = `${node.name.replace(/\..*$/, '')}-${i + 1}`;
      return folder
        ? make(base, 'folder', '—', node.depth + 1)
        : make(`${base}.ts`, 'file', `${(i + 1) * 7} KB`, node.depth + 1);
    });
  }

  const loadChildren = (row: GridRow): Promise<GridRow[]> =>
    new Promise((resolve) => setTimeout(() => resolve(childrenOf(row as FsNode)), 280));
  const hasChildren = (row: GridRow) => (row as FsNode).kind === 'folder';

  const columns: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name', flex: 1, minWidth: 240 },
    { type: 'badge', key: 'kind', header: 'Kind', width: 110, tones: { folder: 'info', file: 'neutral' } },
    { type: 'text', key: 'size', header: 'Size', width: 110, align: 'right' },
  ];
</script>

<p class="note lazy-note">
  Children load on expand (simulated ~280ms latency) and cache. Expand a folder to see the loading row.
</p>

<div class="gridwrap">
  <Grid
    {rows}
    {columns}
    {loadChildren}
    {hasChildren}
    theme={ui.theme}
    height={520}
    ariaLabel="Lazy file tree"
  />
</div>

<style>
  .note {
    margin: 0 0 12px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
    max-width: 760px;
  }
  .gridwrap {
    max-width: 720px;
  }
</style>
