<script lang="ts">
  import { EXAMPLES } from './examples/registry';
  import ExampleSection from './ExampleSection.svelte';
  import { ui, toggleTheme } from './theme.svelte';

  // Every example renders stacked on one page; the rail highlights whichever
  // section is currently in view (scroll-spy) and lets you jump to any of them.
  let activeId = $state(EXAMPLES[0].id);

  // Drive the whole page (chrome + every grid) from one theme toggle.
  $effect(() => {
    document.documentElement.classList.toggle('light', ui.theme === 'light');
  });

  // Scroll-spy: mark the example nearest the top of the viewport as active so the
  // side rail tracks the reader. Inert where IntersectionObserver is unavailable.
  $effect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sections = [...document.querySelectorAll<HTMLElement>('section.lp-ex')];
    if (sections.length === 0) return;
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) activeId = e.target.id.replace(/^ex-/, '');
        }
      },
      { rootMargin: '-25% 0px -65% 0px' },
    );
    sections.forEach((s) => spy.observe(s));
    return () => spy.disconnect();
  });

  const REPO = 'https://github.com/bonguynvan/bo-grid';
  const NPM = 'https://www.npmjs.com/package/bo-grid';

  // Features other grids put behind a paywall — free in bo-grid.
  const FREE = [
    'Grouping + aggregation',
    'Pivot tables',
    'Tree data',
    'Master / detail',
    'Range selection',
    'Excel export',
    'Sparklines',
    'Realtime flash',
  ];

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout>;
  function copyInstall() {
    navigator.clipboard?.writeText('npm i bo-grid');
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1500);
  }
</script>

<nav class="lp-nav">
  <a class="lp-brand" href="#top">bo-grid<span class="lp-ver">{__BO_GRID_VERSION__}</span></a>
  <div class="lp-nav-links">
    <a href="#examples">Examples</a>
    <a href="./api.html">API</a>
    <a href="{REPO}/blob/main/docs/frameworks.md">Frameworks</a>
    <a class="lp-nav-cta" href={NPM} target="_blank" rel="noreferrer">npm ↗</a>
    <a class="lp-nav-cta" href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
    <button
      class="lp-theme"
      type="button"
      onclick={toggleTheme}
      aria-label="Switch to {ui.theme === 'dark' ? 'light' : 'dark'} theme"
      title="Toggle theme"
    >{ui.theme === 'dark' ? '☀' : '☾'}</button>
  </div>
</nav>

<header class="lp-hero" id="top">
  <div class="lp-hero-inner">
    <p class="lp-eyebrow">Svelte 5 · MIT · ~31&nbsp;KB gzip core</p>
    <h1 class="lp-h1">
      Fintech data grids,<br />
      <span class="lp-accent">without the enterprise bill.</span>
    </h1>
    <p class="lp-sub">
      Sparklines, realtime cell flashing, virtual scrolling, grouping, pivot and
      tree data — most of what heavyweight grids paywall, free and native to
      Svelte&nbsp;5.
    </p>

    <div class="lp-install">
      <code><span class="lp-prompt">$</span> npm i bo-grid</code>
      <button class="lp-copy" onclick={copyInstall} aria-label="Copy install command">
        {copied ? 'copied ✓' : 'copy'}
      </button>
    </div>

    <div class="lp-cta">
      <a class="lp-btn lp-btn-primary" href="#examples">Live examples ↓</a>
      <a class="lp-btn" href={REPO} target="_blank" rel="noreferrer">GitHub</a>
      <a class="lp-btn" href="./api.html">API docs</a>
    </div>

    <dl class="lp-stats">
      <div class="lp-stat"><dt>~31 KB</dt><dd>gzip, core</dd></div>
      <div class="lp-stat"><dt>~79 ns</dt><dd>row lookup @ 1M</dd></div>
      <div class="lp-stat"><dt>17</dt><dd>live examples</dd></div>
      <div class="lp-stat"><dt>SSR</dt><dd>SvelteKit-safe</dd></div>
    </dl>
  </div>
</header>

<section class="lp-free" aria-label="Free features">
  <p class="lp-free-label">Paid in AG&nbsp;Grid Enterprise — free here</p>
  <ul class="lp-chips">
    {#each FREE as f (f)}
      <li>{f}</li>
    {/each}
  </ul>
</section>

<section class="lp-examples" id="examples">
  <div class="lp-sec-head">
    <h2>Live examples</h2>
    <p class="lp-sec-sub">All {EXAMPLES.length} on one page — scroll through, or jump from the rail.</p>
  </div>

  <div class="lp-gallery">
    <nav class="lp-toc" aria-label="Jump to example">
      <ul>
        {#each EXAMPLES as ex (ex.id)}
          <li>
            <a href={`#ex-${ex.id}`} class:on={ex.id === activeId} aria-current={ex.id === activeId}>
              {ex.title}
            </a>
          </li>
        {/each}
      </ul>
    </nav>

    <div class="lp-ex-list">
      {#each EXAMPLES as ex, i (ex.id)}
        <ExampleSection {ex} eager={i === 0} />
      {/each}
    </div>
  </div>
</section>

<footer class="lp-foot">
  <div class="lp-foot-cols">
    <div>
      <span class="lp-brand">bo-grid<span class="lp-ver">{__BO_GRID_VERSION__}</span></span>
      <p>A free, fintech-focused Svelte&nbsp;5 data grid. MIT licensed.</p>
    </div>
    <nav class="lp-foot-links" aria-label="Documentation">
      <a href="./api.html">API reference</a>
      <a href="{REPO}/blob/main/BENCHMARKS.md">Benchmarks</a>
      <a href="{REPO}/blob/main/docs/frameworks.md">Frameworks</a>
      <a href="{REPO}/blob/main/docs/sveltekit.md">SvelteKit guide</a>
      <a href={NPM} target="_blank" rel="noreferrer">npm</a>
      <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </div>
  <p class="lp-foot-note">Built with Svelte 5 · MIT © 2026</p>
</footer>

<style>
  /* ---- nav ---- */
  .lp-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 12px clamp(16px, 4vw, 40px);
    background: color-mix(in srgb, var(--header-bg) 82%, transparent);
    backdrop-filter: blur(12px);
    border-bottom: 0.5px solid var(--border);
  }
  .lp-brand {
    font-family: var(--mono);
    font-weight: 700;
    font-size: 15px;
    color: var(--text);
    text-decoration: none;
    letter-spacing: -0.02em;
  }
  .lp-ver {
    margin-left: 6px;
    padding: 1px 6px;
    font-size: 10px;
    font-weight: 600;
    color: var(--up);
    border: 0.5px solid color-mix(in srgb, var(--up) 40%, transparent);
    border-radius: 999px;
    vertical-align: 2px;
  }
  .lp-nav-links {
    display: flex;
    align-items: center;
    gap: clamp(10px, 2vw, 22px);
    font-size: 13px;
  }
  .lp-nav-links a {
    color: var(--text-dim);
    text-decoration: none;
    transition: color 120ms;
  }
  .lp-nav-links a:hover {
    color: var(--text);
  }
  .lp-nav-cta {
    color: var(--text) !important;
  }
  .lp-theme {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    font-size: 13px;
    color: var(--text-dim);
    background: transparent;
    border: 0.5px solid var(--border);
    border-radius: 999px;
    cursor: pointer;
    transition: color 120ms, border-color 120ms;
  }
  .lp-theme:hover {
    color: var(--text);
    border-color: var(--text-dim);
  }

  /* ---- hero ---- */
  .lp-hero {
    position: relative;
    overflow: hidden;
    padding: clamp(56px, 10vw, 132px) clamp(16px, 4vw, 40px) clamp(40px, 6vw, 72px);
    border-bottom: 0.5px solid var(--border);
    /* thematic: a faint grid, plus a green glow — depth without a stock blob */
    background:
      radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--up) 12%, transparent), transparent 60%),
      linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 100% 36px,
      linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 36px 100%,
      var(--bg);
  }
  .lp-hero-inner {
    position: relative;
    max-width: 900px;
    margin: 0 auto;
    text-align: center;
  }
  .lp-eyebrow {
    margin: 0 0 18px;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .lp-h1 {
    margin: 0;
    font-size: clamp(2.1rem, 1rem + 5vw, 4.4rem);
    line-height: 1.02;
    letter-spacing: -0.03em;
    font-weight: 800;
  }
  .lp-accent {
    color: var(--up);
  }
  .lp-sub {
    max-width: 38ch;
    margin: 22px auto 0;
    font-size: clamp(1rem, 0.92rem + 0.4vw, 1.18rem);
    line-height: 1.55;
    color: var(--text-dim);
  }

  .lp-install {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 30px auto 0;
    padding: 8px 8px 8px 16px;
    background: var(--header-bg);
    border: 0.5px solid var(--border);
    border-radius: 12px;
  }
  .lp-install code {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--text);
  }
  .lp-prompt {
    color: var(--up);
    margin-right: 8px;
    user-select: none;
  }
  .lp-copy {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
    background: color-mix(in srgb, var(--text) 6%, transparent);
    border: 0;
    border-radius: 7px;
    padding: 6px 10px;
    cursor: pointer;
    transition: color 120ms, background 120ms;
  }
  .lp-copy:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 12%, transparent);
  }

  .lp-cta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 28px;
  }
  .lp-btn {
    padding: 11px 22px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
    border: 0.5px solid var(--border);
    border-radius: 10px;
    transition: transform 120ms, border-color 120ms, background 120ms;
  }
  .lp-btn:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--text) 24%, transparent);
  }
  .lp-btn-primary {
    color: #0a0a0a;
    background: var(--up);
    border-color: var(--up);
  }
  .lp-btn-primary:hover {
    background: color-mix(in srgb, var(--up) 88%, white);
  }

  .lp-stats {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: clamp(20px, 5vw, 56px);
    margin: 48px 0 0;
  }
  .lp-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .lp-stat dt {
    font-family: var(--mono);
    font-size: clamp(1.3rem, 1rem + 1.4vw, 1.9rem);
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.02em;
  }
  .lp-stat dd {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
  }

  /* ---- free strip ---- */
  .lp-free {
    max-width: 980px;
    margin: 0 auto;
    padding: 40px clamp(16px, 4vw, 40px);
    text-align: center;
  }
  .lp-free-label {
    margin: 0 0 18px;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-dim);
  }
  .lp-chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lp-chips li {
    padding: 7px 14px;
    font-size: 13px;
    color: var(--text);
    background: var(--header-bg);
    border: 0.5px solid var(--border);
    border-radius: 999px;
  }
  .lp-chips li::before {
    content: '✓';
    color: var(--up);
    margin-right: 7px;
    font-weight: 700;
  }

  /* ---- examples ---- */
  .lp-examples {
    flex: 1;
    max-width: 1180px;
    width: 100%;
    margin: 0 auto;
    padding: 32px clamp(16px, 4vw, 40px) 56px;
    scroll-margin-top: 64px;
  }
  .lp-sec-head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px 14px;
    margin-bottom: 18px;
  }
  .lp-sec-head h2 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
  .lp-sec-sub {
    margin: 0;
    font-size: 13px;
    color: var(--text-dim);
  }
  /* Gallery: a sticky jump rail beside a single vertical stack of examples. */
  .lp-gallery {
    display: grid;
    grid-template-columns: 176px minmax(0, 1fr);
    gap: 32px;
    align-items: start;
  }
  .lp-toc {
    position: sticky;
    top: 72px;
    align-self: start;
  }
  .lp-toc ul {
    display: flex;
    flex-direction: column;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: calc(100vh - 96px);
    overflow: auto;
  }
  .lp-toc a {
    display: block;
    padding: 6px 10px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
    text-decoration: none;
    border-left: 2px solid transparent;
    border-radius: 0 8px 8px 0;
    transition: color 120ms, background 120ms, border-color 120ms;
  }
  .lp-toc a:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }
  .lp-toc a.on {
    color: var(--text);
    border-left-color: var(--up);
    background: color-mix(in srgb, var(--up) 12%, transparent);
  }
  .lp-ex-list {
    display: flex;
    flex-direction: column;
    gap: 44px;
    min-width: 0;
  }
  /* Visible keyboard focus (WCAG 2.4.7) for the landing-page controls. */
  .lp-toc a:focus-visible,
  .lp-theme:focus-visible,
  .lp-copy:focus-visible,
  .lp-cta:focus-visible,
  .lp-foot-links a:focus-visible {
    outline: 2px solid var(--up);
    outline-offset: 2px;
  }
  @media (max-width: 720px) {
    .lp-gallery {
      grid-template-columns: 1fr;
    }
    .lp-toc {
      display: none;
    }
  }

  /* ---- footer ---- */
  .lp-foot {
    border-top: 0.5px solid var(--border);
    padding: 40px clamp(16px, 4vw, 40px) 48px;
    background: var(--header-bg);
  }
  .lp-foot-cols {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 28px;
    max-width: 1180px;
    margin: 0 auto;
  }
  .lp-foot-cols p {
    margin: 10px 0 0;
    max-width: 32ch;
    font-size: 13px;
    color: var(--text-dim);
  }
  .lp-foot-links {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 10px 28px;
    align-content: start;
    font-size: 13px;
  }
  .lp-foot-links a {
    color: var(--text-dim);
    text-decoration: none;
    transition: color 120ms;
  }
  .lp-foot-links a:hover {
    color: var(--up);
  }
  .lp-foot-note {
    max-width: 1180px;
    margin: 32px auto 0;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text-dim);
  }

  @media (max-width: 560px) {
    .lp-nav-links {
      gap: 12px;
    }
    .lp-nav-links a:not(.lp-nav-cta) {
      display: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-btn:hover {
      transform: none;
    }
  }
</style>
