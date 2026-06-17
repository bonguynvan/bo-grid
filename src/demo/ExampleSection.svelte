<script lang="ts">
  import { untrack } from 'svelte';
  import type { Example } from './examples/registry';

  let { ex, eager = false }: { ex: Example; eager?: boolean } = $props();

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
    scroll-margin-top: 72px;
  }
  .lp-ex-head {
    margin-bottom: 12px;
  }
  .lp-ex-head h3 {
    margin: 0 0 4px;
    font-size: 1.15rem;
    letter-spacing: -0.015em;
  }
  .lp-ex-head p {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  .lp-ex-body {
    border: 0.5px solid var(--border);
    border-radius: 14px;
    background: var(--bg);
    padding: 16px;
    box-shadow: 0 24px 60px -30px rgba(0, 0, 0, 0.8);
    overflow: auto;
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
