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
    scroll-margin-top: 56px;
  }
  .lp-ex-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 14px;
    align-items: baseline;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--rule, var(--border));
  }
  .lp-ex-n {
    grid-row: span 2;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--down);
  }
  .lp-ex-head h3 {
    margin: 0 0 2px;
    font-family: var(--serif);
    font-size: 1.6rem;
    font-weight: 700;
    font-variation-settings: 'opsz' 72;
    letter-spacing: -0.02em;
  }
  .lp-ex-head p {
    margin: 0;
    font-family: var(--serif);
    font-size: 0.98rem;
    font-style: italic;
    color: var(--text-dim);
  }
  .lp-ex-body {
    border: 1px solid var(--rule, var(--border));
    background: var(--card, var(--bg));
    padding: 16px;
    overflow: auto;
    font-family: var(--mono);
    font-size: 13px;
  }
  .lp-ex-ph {
    min-height: 220px;
    display: grid;
    place-items: center;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-dim);
  }
  .lp-loading {
    margin: 40px 4px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-dim);
  }
</style>
