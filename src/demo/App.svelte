<script lang="ts">
  import { EXAMPLES } from './examples/registry';
  import ExampleSection from './ExampleSection.svelte';
  import HeroBoard from './HeroBoard.svelte';
  import { ui, toggleTheme } from './theme.svelte';
  import { sessionStateAt, sessionLabel, VN_HOSE_SCHEDULE } from '../lib/trading';

  // A broadsheet front page for a trading grid: masthead, ticker tape, a lead
  // story whose figure is a live board, a listings table, then every example.
  let activeId = $state(EXAMPLES[0].id);

  // One toggle drives the page chrome (a class on <html>) and every grid.
  $effect(() => {
    const light = ui.theme === 'light';
    document.documentElement.classList.toggle('light', light);
    document.documentElement.classList.toggle('dark', !light);
  });

  // Scroll-spy: highlight the example nearest the top in the contents rail.
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

  // Masthead dateline and the live HOSE session (evaluated in Vietnam time).
  let now = $state(new Date());
  $effect(() => {
    const h = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(h);
  });
  const dateline = $derived(
    now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  );
  const session = $derived(sessionLabel(sessionStateAt(now, VN_HOSE_SCHEDULE)));

  const TAPE: Array<[string, string, number]> = [
    ['VNM', '68.90', 0.4], ['FPT', '130.80', -1.2], ['HPG', '27.45', 0.3], ['VCB', '91.00', 0],
    ['MWG', '52.10', 0.7], ['SSI', '33.10', -0.35], ['VIC', '44.85', 0.65], ['GAS', '71.20', -0.6],
    ['MSN', '63.90', 0.7], ['VPB', '19.55', -0.1], ['SHS', '15.10', 0.3], ['PVS', '33.60', 0],
  ];

  // Enterprise-only features in AG Grid, all free in bo-grid.
  const LISTINGS = [
    'Row grouping & aggregation',
    'Pivot tables',
    'Tree data',
    'Master / detail',
    'Range selection & fill handle',
    'Clipboard copy & paste',
    'Set filter',
    'Columns tool panel',
    'Context menu',
    'Server-side rows',
    'Excel export',
    'Sparklines',
  ];

  // Figures from BENCHMARKS.md (production build, the Price board demo).
  const FIGURES: Array<[string, string]> = [
    ['~4.5 ms', 'a frame at 30,000 ticks a second'],
    ['~1 ms', 'a scroll step through 1,000 symbols'],
    ['~40 KB', 'gzip core, Svelte excluded'],
    ['$0', 'licence fees — MIT'],
  ];

  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout>;
  function copyInstall() {
    navigator.clipboard?.writeText('npm i bo-grid');
    copied = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied = false), 1500);
  }
  const num = (i: number) => String(i + 1).padStart(2, '0');
</script>

<div class="lp-bar">
  <a class="lp-bar-brand" href="#top">bo-grid <span>v{__BO_GRID_VERSION__}</span></a>
  <span class="lp-bar-date">{dateline}</span>
  <nav class="lp-bar-links" aria-label="Site">
    <a href="#examples">Examples</a>
    <a href="./api.html">API</a>
    <a href="{REPO}/blob/main/docs/frameworks.md">Frameworks</a>
    <a href={NPM} target="_blank" rel="noreferrer">npm ↗</a>
    <a href={REPO} target="_blank" rel="noreferrer">GitHub ↗</a>
    <button
      class="lp-theme"
      type="button"
      onclick={toggleTheme}
      aria-label="Switch to {ui.theme === 'dark' ? 'broadsheet' : 'terminal'} theme"
      title="Toggle theme"
    >{ui.theme === 'dark' ? 'Broadsheet' : 'Terminal'}</button>
  </nav>
</div>

<header class="lp-mast" id="top">
  <div class="lp-mast-row">
    <span>Vol. 2 · Svelte 5 · MIT licence</span>
    <span class="lp-session"><i aria-hidden="true"></i>HOSE · {session}</span>
  </div>
  <h1 class="lp-wordmark">bo-grid</h1>
  <p class="lp-motto">The data grid for busy markets</p>
</header>

<div class="lp-tape" aria-hidden="true">
  <div class="lp-tape-track">
    {#each [...TAPE, ...TAPE] as [sym, px, chg], i (i)}
      <span class="lp-tick">
        <b>{sym}</b>{px}
        <em class:up={chg > 0} class:down={chg < 0}>{chg > 0 ? '▲' : chg < 0 ? '▼' : '■'} {Math.abs(chg).toFixed(2)}</em>
      </span>
    {/each}
  </div>
</div>

<section class="lp-lead" aria-labelledby="lead-h">
  <div class="lp-lead-copy">
    <p class="lp-kicker"><span aria-hidden="true"></span>The lead · Realtime</p>
    <h2 id="lead-h" class="lp-headline">A grid that keeps up with the tape.</h2>
    <p class="lp-deck">
      Built for price boards, bo-grid is a Svelte&nbsp;5 data grid that takes thirty thousand ticks a second
      in a few milliseconds a frame, scrolls a thousand symbols in one-millisecond steps, and ships the
      features heavyweight grids keep behind an enterprise licence — free.
    </p>
    <div class="lp-install">
      <code><span aria-hidden="true">$</span> npm i bo-grid</code>
      <button type="button" onclick={copyInstall} aria-label="Copy install command">{copied ? 'Copied' : 'Copy'}</button>
    </div>
    <p class="lp-links">
      <a href="#examples">Read the live examples ↓</a>
      <a href="./api.html">API reference</a>
      <a href={REPO} target="_blank" rel="noreferrer">Source on GitHub ↗</a>
    </p>
  </div>
  <figure class="lp-fig">
    <HeroBoard />
    <figcaption>
      <b>Fig. 1</b> — A live board fed through <code>api.patchRows</code>: plain rows, coalesced ticks; only
      changed cells repaint, and each one flashes.
    </figcaption>
  </figure>
</section>

<section class="lp-figures" aria-label="Key figures">
  <dl>
    {#each FIGURES as [value, label] (value)}
      <div><dt>{value}</dt><dd>{label}</dd></div>
    {/each}
  </dl>
</section>

<section class="lp-listing" aria-labelledby="listing-h">
  <header>
    <p class="lp-kicker"><span aria-hidden="true"></span>Listings</p>
    <h2 id="listing-h">Enterprise elsewhere. Free here.</h2>
  </header>
  <ul class="lp-list">
    <li class="lp-list-head" aria-hidden="true"><span>Feature</span><span></span><span>AG Grid</span><span>bo-grid</span></li>
    {#each LISTINGS as f (f)}
      <li><span>{f}</span><span class="lp-leader" aria-hidden="true"></span><span class="lp-paid">Enterprise</span><span class="lp-free">Free</span></li>
    {/each}
  </ul>
</section>

<section class="lp-examples" id="examples" aria-labelledby="examples-h">
  <header class="lp-sec-head">
    <p class="lp-kicker"><span aria-hidden="true"></span>Section two</p>
    <h2 id="examples-h">Live examples</h2>
    <p>{EXAMPLES.length} boards on one page. Each mounts as you reach it — scroll, or pick one from the contents.</p>
  </header>
  <div class="lp-gallery">
    <nav class="lp-toc" aria-label="Jump to example">
      <p class="lp-toc-h">Contents</p>
      <ol>
        {#each EXAMPLES as ex, i (ex.id)}
          <li>
            <a href={`#ex-${ex.id}`} class:on={ex.id === activeId} aria-current={ex.id === activeId}>
              <span>{num(i)}</span>{ex.title}
            </a>
          </li>
        {/each}
      </ol>
    </nav>
    <div class="lp-ex-list">
      {#each EXAMPLES as ex, i (ex.id)}
        <ExampleSection {ex} n={i + 1} eager={i === 0} />
      {/each}
    </div>
  </div>
</section>

<footer class="lp-foot">
  <div class="lp-foot-cols">
    <div>
      <p class="lp-foot-brand">bo-grid</p>
      <p>A free Svelte&nbsp;5 data grid for trading screens. MIT licensed.</p>
    </div>
    <nav aria-label="Documentation">
      <a href="./api.html">API reference</a>
      <a href="{REPO}/blob/main/BENCHMARKS.md">Benchmarks</a>
      <a href="{REPO}/blob/main/docs/frameworks.md">Frameworks</a>
      <a href="{REPO}/blob/main/docs/sveltekit.md">SvelteKit guide</a>
    </nav>
    <nav aria-label="Elsewhere">
      <a href={NPM} target="_blank" rel="noreferrer">npm</a>
      <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
      <a href="https://bonguynvan.github.io/tradecanvas/" target="_blank" rel="noreferrer">TradeCanvas — charts ↗</a>
    </nav>
  </div>
  <p class="lp-colophon">Set in Fraunces and JetBrains Mono. Built with Svelte 5. © 2026.</p>
</footer>

<style>
  /* ---- shared ---- */
  .lp-kicker {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 14px;
    font-family: var(--mono);
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }
  .lp-kicker span {
    width: 9px;
    height: 9px;
    background: var(--down);
  }
  a {
    color: inherit;
  }
  .lp-links a,
  .lp-foot a,
  .lp-bar-links a {
    text-decoration: none;
  }
  .lp-links a:hover,
  .lp-foot a:hover,
  .lp-bar-links a:hover {
    background: linear-gradient(transparent 58%, var(--mark-bg) 58%);
  }
  a:focus-visible,
  button:focus-visible {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }

  /* ---- sticky utility bar ---- */
  .lp-bar {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 8px clamp(16px, 4vw, 48px);
    background: var(--paper);
    border-bottom: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 12px;
  }
  .lp-bar-brand {
    font-weight: 700;
    text-decoration: none;
  }
  .lp-bar-brand span {
    font-weight: 400;
    color: var(--ink-dim);
  }
  .lp-bar-date {
    color: var(--ink-dim);
  }
  .lp-bar-links {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-left: auto;
  }
  .lp-theme {
    padding: 3px 9px;
    font: inherit;
    color: var(--paper);
    background: var(--ink);
    border: 0;
    cursor: pointer;
  }
  .lp-theme:hover {
    background: var(--down);
  }

  /* ---- masthead ---- */
  .lp-mast {
    padding: 0 clamp(16px, 4vw, 48px);
    text-align: center;
  }
  .lp-mast-row {
    display: flex;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 3px double var(--rule);
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }
  .lp-session {
    display: inline-flex;
    align-items: center;
    gap: 7px;
  }
  .lp-session i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--up);
    animation: lp-pulse 1.6s ease-in-out infinite;
  }
  @keyframes lp-pulse {
    50% { opacity: 0.25; }
  }
  .lp-wordmark {
    margin: 0;
    padding: 18px 0 0.2em;
    font-family: var(--serif);
    font-size: clamp(4.5rem, 15vw, 12rem);
    font-weight: 800;
    font-style: italic;
    font-variation-settings: 'opsz' 144;
    line-height: 0.9;
    letter-spacing: -0.045em;
  }
  .lp-motto {
    margin: 0;
    padding: 10px 0 12px;
    border-top: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
  }

  /* ---- ticker tape ---- */
  /* A ticker is an LED band in either theme: fixed dark ground, light figures. */
  .lp-tape {
    overflow: hidden;
    border-block: 1px solid var(--rule);
    background: #12130f;
    color: #ece7da;
  }
  .lp-tape-track {
    display: flex;
    width: max-content;
    animation: lp-tape 48s linear infinite;
  }
  .lp-tape:hover .lp-tape-track {
    animation-play-state: paused;
  }
  @keyframes lp-tape {
    to { transform: translateX(-50%); }
  }
  .lp-tick {
    display: inline-flex;
    gap: 8px;
    padding: 9px 22px;
    font-family: var(--mono);
    font-size: 12px;
    border-right: 1px solid rgba(236, 231, 218, 0.18);
    white-space: nowrap;
  }
  .lp-tick em {
    font-style: normal;
    color: #f2c14e;
  }
  .lp-tick em.up {
    color: #3ddc97;
  }
  .lp-tick em.down {
    color: #ff7b72;
  }

  /* ---- lead ---- */
  .lp-lead {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 6fr);
    gap: clamp(28px, 4vw, 64px);
    padding: clamp(36px, 6vw, 80px) clamp(16px, 4vw, 48px);
    border-bottom: 1px solid var(--rule);
  }
  .lp-headline {
    margin: 0 0 22px;
    font-size: clamp(2.4rem, 5.4vw, 4.6rem);
    font-weight: 700;
    font-variation-settings: 'opsz' 144;
    line-height: 0.98;
    letter-spacing: -0.025em;
  }
  .lp-deck {
    max-width: 34em;
    margin: 0 0 26px;
    font-size: clamp(1.05rem, 1.2vw, 1.2rem);
    font-variation-settings: 'opsz' 14;
    line-height: 1.58;
  }
  .lp-deck::first-letter {
    float: left;
    margin: 6px 8px 0 0;
    font-size: 3.6em;
    font-weight: 700;
    line-height: 0.8;
  }
  .lp-install {
    display: inline-flex;
    align-items: stretch;
    margin-bottom: 18px;
    border: 1px solid var(--rule);
    font-family: var(--mono);
    font-size: 14px;
  }
  .lp-install code {
    padding: 10px 16px;
    background: var(--card);
  }
  .lp-install code span {
    color: var(--ink-dim);
  }
  .lp-install button {
    padding: 0 16px;
    font: inherit;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--paper);
    background: var(--ink);
    border: 0;
    border-left: 1px solid var(--rule);
    cursor: pointer;
  }
  .lp-install button:hover {
    background: var(--down);
  }
  .lp-links {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 22px;
    margin: 0;
    font-family: var(--mono);
    font-size: 13px;
  }
  .lp-fig {
    margin: 0;
    align-self: center;
  }
  .lp-fig :global(.bo-grid) {
    border: 1px solid var(--rule);
    border-radius: 0;
  }
  .lp-fig figcaption {
    margin-top: 10px;
    padding-top: 8px;
    border-top: 1px solid var(--rule-soft);
    font-size: 0.9rem;
    font-style: italic;
    color: var(--ink-dim);
  }
  .lp-fig figcaption b {
    font-style: normal;
    color: var(--ink);
  }
  .lp-fig code {
    font-family: var(--mono);
    font-size: 0.85em;
    font-style: normal;
  }

  /* ---- figures strip ---- */
  .lp-figures dl {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    margin: 0;
    border-bottom: 3px double var(--rule);
  }
  .lp-figures div {
    padding: 26px clamp(16px, 3vw, 36px);
  }
  .lp-figures div + div {
    border-left: 1px solid var(--rule);
  }
  .lp-figures dt {
    font-family: var(--mono);
    font-size: clamp(1.8rem, 3.4vw, 2.8rem);
    font-weight: 500;
    letter-spacing: -0.03em;
  }
  .lp-figures dd {
    margin: 6px 0 0;
    font-style: italic;
    color: var(--ink-dim);
  }

  /* ---- listings ---- */
  .lp-listing {
    display: grid;
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    gap: clamp(24px, 4vw, 64px);
    padding: clamp(36px, 6vw, 72px) clamp(16px, 4vw, 48px);
    border-bottom: 1px solid var(--rule);
  }
  .lp-listing h2 {
    margin: 0;
    font-size: clamp(1.9rem, 3.6vw, 3rem);
    font-weight: 600;
    font-variation-settings: 'opsz' 144;
    line-height: 1.02;
    letter-spacing: -0.02em;
  }
  .lp-list {
    margin: 0;
    padding: 0;
    list-style: none;
    font-family: var(--mono);
    font-size: 13px;
  }
  .lp-list li {
    display: grid;
    grid-template-columns: auto minmax(24px, 1fr) 96px 64px;
    align-items: baseline;
    gap: 10px;
    padding: 9px 0;
    border-bottom: 1px solid var(--rule-soft);
  }
  .lp-list .lp-list-head {
    padding-top: 0;
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--ink-dim);
    border-bottom: 1px solid var(--rule);
  }
  .lp-leader {
    border-bottom: 1px dotted var(--ink-dim);
    transform: translateY(-4px);
  }
  .lp-paid {
    color: var(--down);
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }
  .lp-free {
    font-weight: 700;
    color: var(--up);
  }

  /* ---- examples ---- */
  .lp-examples {
    padding: clamp(36px, 6vw, 72px) clamp(16px, 4vw, 48px) 80px;
  }
  .lp-sec-head {
    max-width: 52rem;
    margin-bottom: 36px;
  }
  .lp-sec-head h2 {
    margin: 0 0 10px;
    font-size: clamp(2.2rem, 4.6vw, 3.6rem);
    font-weight: 700;
    font-variation-settings: 'opsz' 144;
    letter-spacing: -0.025em;
    line-height: 1;
  }
  .lp-sec-head > p:last-child {
    margin: 0;
    font-size: 1.05rem;
    font-style: italic;
    color: var(--ink-dim);
  }
  .lp-gallery {
    display: grid;
    grid-template-columns: 200px minmax(0, 1fr);
    gap: clamp(24px, 3vw, 48px);
    align-items: start;
  }
  .lp-toc {
    position: sticky;
    top: 52px;
    max-height: calc(100vh - 72px);
    overflow-y: auto;
    border-top: 3px double var(--rule);
  }
  .lp-toc-h {
    margin: 10px 0 8px;
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }
  .lp-toc ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .lp-toc a {
    display: flex;
    gap: 10px;
    padding: 5px 6px;
    font-size: 0.95rem;
    text-decoration: none;
    border-bottom: 1px solid var(--rule-soft);
  }
  .lp-toc a span {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-dim);
    padding-top: 3px;
  }
  .lp-toc a:hover {
    background: var(--paper-2);
  }
  .lp-toc a.on {
    background: var(--mark-bg);
    font-weight: 600;
  }
  .lp-ex-list {
    display: flex;
    flex-direction: column;
    gap: 64px;
    min-width: 0;
  }

  /* ---- footer ---- */
  .lp-foot {
    margin-top: auto;
    padding: 36px clamp(16px, 4vw, 48px) 28px;
    border-top: 3px double var(--rule);
  }
  .lp-foot-cols {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 32px;
  }
  .lp-foot-cols p {
    margin: 0 0 6px;
    color: var(--ink-dim);
  }
  .lp-foot-brand {
    font-size: 2rem;
    font-weight: 800;
    font-style: italic;
    color: var(--ink) !important;
    letter-spacing: -0.03em;
  }
  .lp-foot nav {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-family: var(--mono);
    font-size: 13px;
  }
  .lp-colophon {
    margin: 28px 0 0;
    padding-top: 12px;
    border-top: 1px solid var(--rule-soft);
    font-size: 0.85rem;
    font-style: italic;
    color: var(--ink-dim);
  }

  /* ---- responsive ---- */
  @media (max-width: 960px) {
    .lp-lead,
    .lp-listing {
      grid-template-columns: minmax(0, 1fr);
    }
    .lp-gallery {
      grid-template-columns: minmax(0, 1fr);
    }
    .lp-toc {
      display: none;
    }
  }
  @media (max-width: 720px) {
    .lp-bar-date,
    .lp-bar-links a:not(:last-of-type) {
      display: none;
    }
    .lp-figures dl {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .lp-figures div:nth-child(3) {
      border-left: 0;
    }
    .lp-figures div:nth-child(n + 3) {
      border-top: 1px solid var(--rule);
    }
    .lp-foot-cols {
      grid-template-columns: minmax(0, 1fr);
    }
    .lp-mast-row span:first-child {
      display: none;
    }
    .lp-mast-row {
      justify-content: center;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .lp-tape-track,
    .lp-session i {
      animation: none;
    }
  }
</style>
