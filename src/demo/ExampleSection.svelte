<script lang="ts">
  import { untrack } from 'svelte';
  import type { Example } from './examples/registry';

  let { ex, n, eager = false }: { ex: Example; n?: number; eager?: boolean } = $props();

  // Eagerly-bundled examples (the first one) render immediately; the rest mount
  // their (code-split) grid only once scrolled near the viewport. This keeps a
  // single long page from booting 17 grids — and 17 realtime timers — at once.
  // (eager/ex are fixed for the component's life — untrack the initial read.)
  let shown = $state(untrack(() => eager || !!ex.component));
  let host = $state<HTMLElement>();

  $effect(() => {
    if (shown || !host) return;
    // No IntersectionObserver (old engines, SSR-less test envs without a stub):
    // fall back to mounting immediately so the example is never stranded.
    if (typeof IntersectionObserver === 'undefined') {
      shown = true;
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            shown = true;
            io.disconnect();
          }
        }
      },
      { rootMargin: '320px 0px' },
    );
    io.observe(host);
    return () => io.disconnect();
  });

  const Eager = $derived(ex.component);
</script>

<section class="lp-ex" id={`ex-${ex.id}`} aria-labelledby={`ex-${ex.id}-h`}>
  <header class="lp-ex-head">
    {#if n}<span class="lp-ex-n">Ex. {String(n).padStart(2, '0')}</span>{/if}
    <h3 id={`ex-${ex.id}-h`}>{ex.title}</h3>
    <p>{ex.blurb}</p>
  </header>
  <div class="lp-ex-body" bind:this={host} data-ex={ex.id}>
    {#if shown}
      {#if Eager}
        <Eager />
      {:else if ex.load}
        {#await ex.load()}
          <p class="lp-loading">Loading example…</p>
        {:then mod}
          {@const Lazy = mod.default}
          <Lazy />
        {/await}
      {/if}
    {:else}
      <div class="lp-ex-ph" aria-hidden="true">Scroll to load…</div>
    {/if}
  </div>
</section>

<style>
  .lp-ex {
    scroll-margin-top: 64px;
  }
  .lp-ex-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 14px;
    align-items: baseline;
    margin-bottom: 12px;
  }
  .lp-ex-n {
    grid-row: span 2;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .lp-ex-head h3 {
    margin: 0 0 3px;
    font-family: var(--font-cond);
    font-size: 1.45rem;
    font-weight: 700;
    letter-spacing: -0.005em;
  }
  .lp-ex-head p {
    margin: 0;
    max-width: 72ch;
    font-size: 14px;
    line-height: 1.55;
    color: var(--text-2);
  }
  .lp-ex-body {
    padding: 14px;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: 13px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
  }
  .lp-ex-ph {
    min-height: 220px;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-3);
  }
  .lp-loading {
    margin: 40px 4px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-3);
  }
</style>
