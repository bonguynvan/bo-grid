<script lang="ts">
  import { flushSync } from 'svelte';
  import { Grid, type ColumnDef, type GridApi, type GridRow } from '../../lib';
  import { createTickStream, createRowIndex, applyPatches } from '../../lib/realtime';
  import { vnBands, vnTickSize } from '../../lib/trading';
  import { ui } from '../theme.svelte';
  import { FpsMeter } from '../perf/fps.svelte';

  // A full VN-style price board (bảng giá) under a busy-market load: hundreds of
  // symbols, three bid/ask levels, match, high/low, foreign flow — every changed
  // cell flashes and prices colour by ceiling/floor/reference. Ticks go through
  // bo-grid/realtime's coalescing stream, the recommended feed path.
  // `window.__priceBoard.bench()` measures the cost of one frame, split into
  // applying the data, Svelte updating the DOM, and style + layout.
  interface Quote extends GridRow {
    symbol: string;
    ref: number;
    ceil: number;
    floor: number;
    bp3: number; bv3: number; bp2: number; bv2: number; bp1: number; bv1: number;
    mp: number; mv: number; chg: number;
    ap1: number; av1: number; ap2: number; av2: number; ap3: number; av3: number;
    hi: number; lo: number; tv: number; fb: number; fs: number;
  }

  // Deterministic PRNG so every benchmark run sees the same ticks.
  function prng(seed: number) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  let rand = prng(42);
  const rint = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const code = (i: number) =>
    String.fromCharCode(65 + (Math.floor(i / 676) % 26), 65 + (Math.floor(i / 26) % 26), 65 + (i % 26));

  function build(n: number): Quote[] {
    rand = prng(42);
    return Array.from({ length: n }, (_, id) => {
      const ref = Math.round(rint(10_000, 150_000) / 100) * 100;
      const { ceiling, floor } = vnBands(ref, 'HOSE');
      const t = vnTickSize(ref, 'HOSE');
      return {
        id, symbol: code(id), ref, ceil: ceiling ?? ref, floor: floor ?? ref,
        bp3: ref - 3 * t, bv3: rint(1, 900) * 10, bp2: ref - 2 * t, bv2: rint(1, 900) * 10, bp1: ref - t, bv1: rint(1, 900) * 10,
        mp: ref, mv: 0, chg: 0,
        ap1: ref + t, av1: rint(1, 900) * 10, ap2: ref + 2 * t, av2: rint(1, 900) * 10, ap3: ref + 3 * t, av3: rint(1, 900) * 10,
        hi: ref, lo: ref, tv: 0, fb: 0, fs: 0,
      };
    });
  }

  // One market event for a symbol: a match, the touch moving, sometimes depth.
  function event(q: Quote): Partial<Quote> {
    const t = vnTickSize(q.mp, 'HOSE');
    const mp = Math.min(q.ceil, Math.max(q.floor, q.mp + Math.round((rand() - 0.5) * 4) * t));
    const mv = rint(1, 500) * 10;
    const p: Partial<Quote> = {
      mp, mv, chg: mp - q.ref, tv: q.tv + mv, hi: Math.max(q.hi, mp), lo: Math.min(q.lo, mp),
      bp1: mp - t, bv1: rint(1, 900) * 10, ap1: mp + t, av1: rint(1, 900) * 10,
    };
    if (rand() < 0.5) Object.assign(p, { bp2: mp - 2 * t, bv2: rint(1, 900) * 10, ap2: mp + 2 * t, av2: rint(1, 900) * 10 });
    if (rand() < 0.25) Object.assign(p, { bp3: mp - 3 * t, bv3: rint(1, 900) * 10, ap3: mp + 3 * t, av3: rint(1, 900) * 10 });
    if (rand() < 0.2) Object.assign(p, rand() < 0.5 ? { fb: q.fb + mv } : { fs: q.fs + mv });
    return p;
  }

  // Two ways to feed the grid, for comparison:
  //  - 'patch' (recommended for busy feeds): rows are plain objects and the grid
  //    writes ticks into them through api.patchRows, repainting only rendered rows.
  //  - 'state': rows are deep $state proxies and ticks are written through them.
  let mode = $state<'patch' | 'state'>('patch');
  let n = $state(1000);
  let plainRows = $state.raw<Quote[]>(build(1000));
  let stateRows = $state<Quote[]>([]);
  const rows = $derived(mode === 'patch' ? plainRows : stateRows);
  let index = new Map<number, Quote>();
  let api: GridApi | null = null;
  const stream = createTickStream<number, Partial<Quote>>({
    cap: 2000,
    apply: (b) => (mode === 'patch' ? api?.patchRows(b) : applyPatches(index, b)),
  });
  function load(nextMode: 'patch' | 'state', size: number) {
    stream.stop({ discard: true });
    mode = nextMode;
    n = size;
    if (nextMode === 'patch') {
      plainRows = build(size);
      stateRows = [];
    } else {
      stateRows = build(size);
      plainRows = [];
      index = createRowIndex(stateRows, (r) => r.id);
    }
  }
  const setSize = (size: number) => load(mode, size);

  const k = (v: unknown) => (Number(v) ? (Number(v) / 1000).toFixed(2) : '');
  const vol = (v: unknown) => (Number(v) ? String(v) : '');
  function tone(v: unknown, r: GridRow): string {
    const q = r as Quote;
    const p = Number(v);
    if (!p) return '';
    if (p >= q.ceil) return 'pb-ceil';
    if (p <= q.floor) return 'pb-floor';
    if (p === q.ref) return 'pb-ref';
    return p > q.ref ? 'pb-up' : 'pb-down';
  }
  const price = (key: string, header: string): ColumnDef =>
    ({ type: 'price', key, header, width: 62, format: k, cellClass: tone, flash: 'auto', flashColor: false, sortable: false }) as ColumnDef;
  const qty = (key: string, header: string): ColumnDef =>
    ({ type: 'number', key, header, width: 64, format: vol, flash: 'auto', sortable: false }) as ColumnDef;

  const columns: ColumnDef[] = [
    { type: 'text', key: 'symbol', header: 'Mã', width: 56, pinned: 'left', cellClass: (_v, r) => tone((r as Quote).mp, r) },
    { type: 'price', key: 'ref', header: 'TC', width: 56, format: k, cellClass: 'pb-ref', sortable: false },
    { type: 'price', key: 'ceil', header: 'Trần', width: 56, format: k, cellClass: 'pb-ceil', sortable: false },
    { type: 'price', key: 'floor', header: 'Sàn', width: 56, format: k, cellClass: 'pb-floor', sortable: false },
    price('bp3', 'G3'), qty('bv3', 'KL3'), price('bp2', 'G2'), qty('bv2', 'KL2'), price('bp1', 'G1'), qty('bv1', 'KL1'),
    { ...price('mp', 'Giá'), width: 62 }, qty('mv', 'KL'),
    { type: 'number', key: 'chg', header: '+/-', width: 56, format: (v) => (Number(v) ? (Number(v) / 1000).toFixed(2) : ''), cellClass: (_v, r) => tone((r as Quote).mp, r), sortable: false },
    price('ap1', 'G1'), qty('av1', 'KL1'), price('ap2', 'G2'), qty('av2', 'KL2'), price('ap3', 'G3'), qty('av3', 'KL3'),
    price('hi', 'Cao'), price('lo', 'Thấp'), { ...qty('tv', 'Tổng KL'), width: 76 }, qty('fb', 'NN mua'), qty('fs', 'NN bán'),
  ];

  // ---- Live mode: a feed at `rate` events/s, drained once per frame ----
  let rate = $state(3000);
  let live = $state(false);
  const fps = new FpsMeter();
  $effect(() => {
    if (!live) return;
    stream.start();
    fps.start();
    let last = performance.now();
    let carry = 0;
    const h = setInterval(() => {
      const now = performance.now();
      carry += ((now - last) / 1000) * rate;
      last = now;
      for (; carry >= 1; carry--) {
        const q = rows[rint(0, rows.length - 1)];
        stream.push(q.id, event(q));
      }
    }, 10);
    return () => {
      clearInterval(h);
      stream.stop();
      fps.stop();
    };
  });

  // ---- Benchmark: deterministic frames, each fully rendered synchronously ----
  let host: HTMLDivElement;
  let result = $state<string>('');
  let lastResult: unknown = null;
  const pct = (xs: number[], p: number) => {
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
  };
  async function bench(opts: { frames?: number; eventsPerSec?: number } = {}) {
    const frames = opts.frames ?? 240;
    const perFrame = Math.round((opts.eventsPerSec ?? rate) / 60);
    live = false;
    flushSync();
    rand = prng(7);
    const apply: number[] = [], render: number[] = [], layout: number[] = [], total: number[] = [];
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < perFrame; i++) {
        const q = rows[rint(0, rows.length - 1)];
        stream.push(q.id, event(q));
      }
      const t0 = performance.now();
      stream.flushNow();
      const t1 = performance.now();
      flushSync();
      const t2 = performance.now();
      void host.offsetHeight;
      void getComputedStyle(host.querySelector('.row .c') ?? host).color;
      const t3 = performance.now();
      apply.push(t1 - t0); render.push(t2 - t1); layout.push(t3 - t2); total.push(t3 - t0);
      if (f % 20 === 19) await Promise.resolve();
    }
    const stat = (xs: number[]) => ({
      avg: +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2),
      p50: +pct(xs, 50).toFixed(2),
      p95: +pct(xs, 95).toFixed(2),
      max: +Math.max(...xs).toFixed(2),
    });
    const out = {
      mode,
      symbols: rows.length,
      eventsPerFrame: perFrame,
      visibleRows: host.querySelectorAll('.viewport .row').length,
      apply: stat(apply), render: stat(render), layout: stat(layout), total: stat(total),
      over16ms: total.filter((t) => t > 16.7).length,
      frames,
    };
    lastResult = out;
    result = `${mode} · ${out.symbols} symbols · ${perFrame} events/frame · frame p50 ${out.total.p50} ms / p95 ${out.total.p95} ms (apply ${out.apply.p50} · render ${out.render.p50} · layout ${out.layout.p50}) · ${out.over16ms}/${frames} over 16.7 ms`;
    return out;
  }
  $effect(() => {
    (window as unknown as Record<string, unknown>).__priceBoard = { bench, setSize, load, last: () => lastResult, rows: () => rows, api: () => api };
  });
</script>

<div class="pb-controls">
  <label>Symbols
    <select value={n} onchange={(e) => setSize(Number(e.currentTarget.value))}>
      {#each [400, 1000, 1600] as v (v)}<option value={v}>{v}</option>{/each}
    </select>
  </label>
  <label>Rows
    <select value={mode} onchange={(e) => load(e.currentTarget.value as 'patch' | 'state', n)}>
      <option value="patch">plain + patchRows</option>
      <option value="state">$state proxies</option>
    </select>
  </label>
  <label>Feed
    <select bind:value={rate}>
      {#each [1000, 3000, 10000, 30000] as v (v)}<option value={v}>{v.toLocaleString()} events/s</option>{/each}
    </select>
  </label>
  <button class="pb-btn" class:on={live} onclick={() => (live = !live)}>{live ? 'Stop feed' : 'Start feed'}</button>
  <button class="pb-btn" onclick={() => bench()}>Benchmark</button>
  {#if live}<span class="pb-stat">{fps.fps} fps · {stream.pending} pending</span>{/if}
  {#if result}<span class="pb-stat">{result}</span>{/if}
</div>
<div class="gridwrap" bind:this={host}>
  <Grid rows={rows as unknown as GridRow[]} {columns} height={620} theme={ui.theme} ariaLabel="Price board" onReady={(a) => (api = a)} />
</div>

<style>
  .pb-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
    font-size: 12px;
    color: var(--text-dim, #8a8a8a);
  }
  .pb-controls select {
    margin-left: 4px;
    font: inherit;
  }
  .pb-btn {
    padding: 4px 10px;
    font: inherit;
    color: inherit;
    background: transparent;
    border: 0.5px solid currentColor;
    border-radius: 6px;
    cursor: pointer;
  }
  .pb-btn.on {
    color: var(--up, #34d399);
  }
  .pb-stat {
    font-variant-numeric: tabular-nums;
  }
  .gridwrap :global(.pb-up) { color: #34d399; }
  .gridwrap :global(.pb-down) { color: #f87171; }
  .gridwrap :global(.pb-ref) { color: #facc15; }
  .gridwrap :global(.pb-ceil) { color: #c084fc; }
  .gridwrap :global(.pb-floor) { color: #22d3ee; }
</style>
