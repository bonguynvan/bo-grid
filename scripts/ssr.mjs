// SSR safety check. SvelteKit renders components on the server first, so <Grid>
// must produce HTML without touching window / document / localStorage at render
// time. Effects and event handlers don't run during SSR, but derived state and
// the render path do — this script proves they stay browser-global-free.
//
// Run as a standalone Vite SSR server (not vitest): vitest's fake environment
// can't preprocess Svelte component CSS, but a real dev server can.
import { createServer } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

function fail(msg) {
  console.error(`✗ ssr: ${msg}`);
  process.exit(1);
}

const server = await createServer({
  configFile: false,
  plugins: [svelte()],
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  // Resolve render + the component from the same SSR module graph so they share
  // one Svelte instance (avoids dual-package mismatches).
  const { render } = await server.ssrLoadModule('svelte/server');
  const Grid = (await server.ssrLoadModule('/src/lib/grid/Grid.svelte')).default;

  const columns = [
    { type: 'text', key: 'name', header: 'Name' },
    { type: 'price', key: 'px', header: 'Price' },
    { type: 'percent', key: 'chg', header: 'Chg' },
    { type: 'sparkline', key: 'spark', header: 'Trend', sparkKey: 'candles' },
  ];
  const rows = [
    { id: 1, name: 'ACME', px: 12.5, chg: 1.2, candles: [] },
    { id: 2, name: 'BETA', px: 8.0, chg: -0.5, candles: [] },
  ];

  // Plain render.
  const basic = render(Grid, { props: { rows, columns, height: 400 } });
  if (!basic.body.includes('bo-grid')) fail('grid markup not produced on the server');
  if (!basic.body.includes('ACME') || !basic.body.includes('BETA')) {
    fail('row data not present in server-rendered HTML');
  }

  // Feature-heavy props, including the localStorage-guarded persistKey path and
  // a sparkline column (its canvas draw must stay in a client-only effect).
  const heavy = render(Grid, {
    props: {
      rows,
      columns,
      height: 400,
      rowSelection: true,
      filterRow: true,
      footer: true,
      groupBy: ['name'],
      pageSize: 1,
      ariaLabel: 'SSR grid',
      persistKey: 'ssr-check',
      theme: 'light',
    },
  });
  if (!heavy.body.includes('bo-grid')) fail('feature-heavy grid did not server-render');

  const cellCount = (basic.body.match(/role="gridcell"/g) || []).length;
  console.log(
    `✓ ssr: <Grid> server-rendered cleanly — ${cellCount} cells, ` +
      `basic + feature-heavy (rowSelection/filterRow/footer/groupBy/pagination/persistKey/sparkline/theme) OK`,
  );
} catch (err) {
  fail(err && err.stack ? err.stack : String(err));
} finally {
  await server.close();
}
