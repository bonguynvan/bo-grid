<script lang="ts">
  import { EXAMPLES } from './examples/registry';

  let activeId = $state(EXAMPLES[0].id);
  const active = $derived(EXAMPLES.find((e) => e.id === activeId) ?? EXAMPLES[0]);
  const Eager = $derived(active.component);
</script>

<header class="bar">
  <div class="title">
    <span class="logo">bo-grid</span>
    <span class="tag">{active.blurb}</span>
  </div>
  <div class="right">
    <div class="tabs" role="tablist" aria-label="Examples">
      {#each EXAMPLES as ex (ex.id)}
        <button
          role="tab"
          aria-selected={ex.id === activeId}
          class:on={ex.id === activeId}
          onclick={() => (activeId = ex.id)}
        >
          {ex.title}
        </button>
      {/each}
    </div>
    <a class="apilink" href="./api.html">API docs ↗</a>
  </div>
</header>

<main>
  {#key activeId}
    {#if Eager}
      <Eager />
    {:else if active.load}
      {#await active.load()}
        <p class="loading">Loading example…</p>
      {:then mod}
        {@const Lazy = mod.default}
        <Lazy />
      {/await}
    {/if}
  {/key}
</main>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 18px;
    border-bottom: 0.5px solid var(--border);
    background: var(--header-bg);
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
  }
  .logo {
    font-family: var(--mono);
    font-weight: 700;
    font-size: 15px;
  }
  .tag {
    font-size: 12px;
    color: var(--text-dim);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .right {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .tabs {
    display: inline-flex;
    gap: 2px;
    padding: 2px;
    border: 0.5px solid var(--border);
    border-radius: 999px;
  }
  .tabs button {
    padding: 5px 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
    background: transparent;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    white-space: nowrap;
  }
  .tabs button:hover {
    color: var(--text);
  }
  .tabs button.on {
    color: #0a0a0a;
    background: var(--up);
  }
  .apilink {
    font-size: 12px;
    color: var(--up);
    text-decoration: none;
    white-space: nowrap;
  }
  .apilink:hover {
    text-decoration: underline;
  }
  main {
    flex: 1;
    padding: 18px;
    overflow: auto;
  }
  .loading {
    margin: 40px 4px;
    font-family: var(--mono);
    font-size: 13px;
    color: var(--text-dim);
  }
</style>
