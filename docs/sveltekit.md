# Using bo-grid with SvelteKit

bo-grid is **SSR-safe**: `<Grid>` renders to HTML on the server without touching
`window`, `document`, or `localStorage`, then hydrates on the client. There's no
`browser` guard, no dynamic-only import, and no CSS import to wire up — drop it in
a page and it works. (A CI gate, `pnpm ssr`, server-renders the grid on every
build to keep it that way.)

## Install

```sh
npm i bo-grid
# peer dependency: svelte@^5 (already present in a SvelteKit app)
```

Excel export is optional — install `xlsx` only if you call `exportXLSX`; it loads
as a separate chunk via dynamic import and never touches your main bundle:

```sh
npm i xlsx   # only if you use Excel export
```

## Minimal page

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from 'bo-grid';

  const columns: ColumnDef[] = [
    { type: 'text',    key: 'symbol', header: 'Symbol', width: 120 },
    { type: 'price',   key: 'price',  header: 'Price', width: 100 },
    { type: 'percent', key: 'changePct', header: 'Chg %', width: 90 },
  ];

  const rows: GridRow[] = [
    { id: 'AAPL', symbol: 'AAPL', price: 192.3, changePct: 1.4 },
    { id: 'MSFT', symbol: 'MSFT', price: 421.1, changePct: -0.6 },
  ];
</script>

<Grid {rows} {columns} height={640} ariaLabel="Watchlist" />
```

No `onMount`, no `{#if browser}` — the table is in the server-rendered HTML, which
is good for first paint and crawlability.

## Loading data in a `load` function

Fetch on the server (or universally) and pass the result as a prop. Keep the
columns definition in the component:

```ts
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  const res = await fetch('https://api.example.com/quotes');
  const rows = await res.json();
  return { rows };
};
```

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from 'bo-grid';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
  const columns: ColumnDef[] = [/* … */];
</script>

<Grid rows={data.rows} {columns} height={640} />
```

## Realtime updates (client only)

The grid renders on the server, but a live feed is a browser concern — open the
socket in `onMount`. Make the hot fields `$state` so a tick flashes the cell
without re-rendering the whole table:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Grid, type ColumnDef, type GridRow } from 'bo-grid';

  let { data } = $props();
  let rows: GridRow[] = $state(data.rows);

  onMount(() => {
    const ws = new WebSocket('wss://feed.example.com');
    ws.onmessage = (e) => {
      const tick = JSON.parse(e.data);
      const row = rows.find((r) => r.id === tick.id);
      if (!row) return;
      row.flashDir = tick.price >= row.price ? 'up' : 'down';
      row.price = tick.price;       // mutate the $state field in place
      row.flashSeq = (row.flashSeq ?? 0) + 1; // triggers the flash on a `flash: true` column
    };
    return () => ws.close();
  });
</script>

<Grid {rows} {columns} height={640} />
```

> **Mutation contract:** per-cell updates mutate a row's `$state` fields in place
> (fast, flashes only that cell). But **adding, removing, or reordering rows needs
> a new array reference** — `rows = [...rows, newRow]` — because the grid reads the
> array once and iterates it untracked. (The same applies outside SvelteKit.)

## Layout persistence

`persistKey` saves column order/width to `localStorage`. It's guarded for SSR, so
it's safe to set unconditionally — it simply no-ops on the server and restores on
the client:

```svelte
<Grid {rows} {columns} height={640} persistKey="watchlist" />
```

## Notes

- **Styles** are bundled with the component (scoped `--bo-grid-*` CSS variables) —
  there's nothing to import. Override tokens via the `theme` prop or your own CSS.
- **Vite/`optimizeDeps`:** no special config needed. If you use Excel export and
  see an optimize warning for `xlsx`, add it to `optimizeDeps.exclude` (it's a
  dynamic import) or just `npm i xlsx`.
- See the [API reference](https://bonguynvan.github.io/bo-grid/api.html) for every
  prop and the [README](../README.md) for feature walkthroughs.
```
