<script lang="ts">
  import { untrack } from 'svelte';
  import type { Example } from './examples/registry';
  import { loadSource } from './sources';
  import { highlight } from './highlight';

  const SOURCE_URL = 'https://github.com/bonguynvan/bo-grid/blob/main/src/demo/examples/';

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

  // Preview / Code: the example stays mounted while its source is shown, so a
  // live board keeps its state. The source loads on first open.
  let view = $state<'preview' | 'code'>('preview');
  let source = $state<Promise<string> | null>(null);
  let copied = $state(false);
  function showCode() {
    view = 'code';
    source ??= loadSource(ex.file);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      /* clipboard blocked: the code is still selectable */
    }
  }
</script>

<section class="lp-ex" id={`ex-${ex.id}`} aria-labelledby={`ex-${ex.id}-h`}>
  <header class="lp-ex-head">
    {#if n}<span class="lp-ex-n">Ex. {String(n).padStart(2, '0')}</span>{/if}
    <h3 id={`ex-${ex.id}-h`}>{ex.title}</h3>
    <p>{ex.blurb}</p>
    <div class="lp-ex-switch" role="group" aria-label={`${ex.title}: view`}>
      <button type="button" aria-pressed={view === 'preview'} onclick={() => (view = 'preview')}>Preview</button>
      <button type="button" aria-pressed={view === 'code'} onclick={showCode}>Code</button>
    </div>
  </header>
  <div class="lp-ex-body" bind:this={host} data-ex={ex.id} hidden={view !== 'preview'}>
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
  {#if view === 'code' && source}
    <div class="lp-ex-code">
      {#await source}
        <p class="lp-loading">Loading source…</p>
      {:then text}
        <div class="lp-code-bar">
          <span class="lp-code-path">src/demo/examples/{ex.file}.svelte</span>
          <a href={`${SOURCE_URL}${ex.file}.svelte`} target="_blank" rel="noreferrer">GitHub ↗</a>
          <button type="button" onclick={() => copy(text)}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        <!-- A scrolling region must take focus so keyboard users can scroll it. -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <pre tabindex="0" aria-label={`${ex.title} source`}><code>{@html highlight(text)}</code></pre>
      {:catch}
        <p class="lp-loading">
          Couldn't load the source. <a href={`${SOURCE_URL}${ex.file}.svelte`} target="_blank" rel="noreferrer">View it on GitHub ↗</a>
        </p>
      {/await}
    </div>
  {/if}
</section>

<style>
  .lp-ex {
    scroll-margin-top: 64px;
  }
  .lp-ex-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
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
  /* Title and blurb keep the middle column, so neither flows into the
     switch's column when the switch moves under them on a phone. */
  .lp-ex-head h3,
  .lp-ex-head p {
    grid-column: 2;
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
  /* Preview / Code switch: a two-segment pill at the right of the header. */
  .lp-ex-switch {
    grid-column: 3;
    grid-row: 1 / span 2;
    align-self: center;
    display: inline-flex;
    padding: 2px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 999px;
  }
  .lp-ex-switch button {
    padding: 4px 12px;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-3);
    background: transparent;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
  }
  .lp-ex-switch button:hover {
    color: var(--text);
  }
  .lp-ex-switch button[aria-pressed='true'] {
    color: var(--on-accent);
    background: var(--accent);
  }
  .lp-ex-switch button:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }
  /* On a phone the switch sits under the blurb instead of squeezing it. */
  @media (max-width: 560px) {
    .lp-ex-switch {
      grid-column: 2;
      grid-row: 3;
      justify-self: start;
      margin-top: 10px;
    }
  }
  .lp-ex-body[hidden] {
    display: none;
  }
  .lp-ex-code {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }
  .lp-code-bar {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 8px 14px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-3);
    border-bottom: 1px solid var(--line);
  }
  .lp-code-path {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .lp-code-bar a,
  .lp-code-bar button {
    flex: none;
    white-space: nowrap;
    font: inherit;
    color: var(--text-2);
    text-decoration: none;
    background: transparent;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
  .lp-code-bar a:hover,
  .lp-code-bar button:hover {
    color: var(--accent);
  }
  .lp-ex-code pre {
    margin: 0;
    max-height: 640px;
    padding: 14px;
    overflow: auto;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.6;
    color: var(--text);
    tab-size: 2;
  }
  .lp-ex-code pre:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
  }
  /* Token colours (spans come from {@html}, so they are global to this view). */
  .lp-ex-code :global(.c) {
    color: var(--text-3);
    font-style: italic;
  }
  .lp-ex-code :global(.s) {
    color: var(--up);
  }
  .lp-ex-code :global(.k) {
    color: var(--accent);
  }
  .lp-ex-code :global(.t) {
    color: var(--floor);
  }
  .lp-ex-code :global(.b),
  .lp-ex-code :global(.r) {
    color: var(--ceil);
  }
  .lp-ex-code :global(.n) {
    color: var(--info);
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
