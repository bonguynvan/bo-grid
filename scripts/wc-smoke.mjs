// Smoke-test the framework-agnostic custom element: register <bo-grid> from the
// built bundle, set its `config`, and assert it renders real rows in light DOM.
// This is what a React/Vue/Angular/vanilla consumer relies on.
import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.customElements = window.customElements;
globalThis.HTMLElement = window.HTMLElement;
for (const k of Object.getOwnPropertyNames(window)) {
  if (k in globalThis) continue;
  try {
    globalThis[k] = window[k];
  } catch {}
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
window.HTMLCanvasElement.prototype.getContext = () => ({
  setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fillRect() {}, save() {}, restore() {},
  set strokeStyle(_v) {}, set fillStyle(_v) {}, set lineWidth(_v) {},
});

function fail(msg) {
  console.error(`✗ wc-smoke: ${msg}`);
  process.exit(1);
}
process.on('unhandledRejection', (e) => fail(`unhandled rejection: ${e?.stack || e}`));

const entry = resolve('dist/bo-grid.element.js');
if (!existsSync(entry)) fail('dist/bo-grid.element.js not found — run the WC build first');

let createBoGrid;
try {
  ({ createBoGrid } = await import(pathToFileURL(entry).href)); // registers <bo-grid>
} catch (e) {
  fail(`importing the element bundle threw: ${e?.stack || e}`);
}

if (!window.customElements.get('bo-grid')) fail('<bo-grid> was not registered with customElements');
if (typeof createBoGrid !== 'function') fail('the element bundle does not export createBoGrid()');

const el = document.createElement('bo-grid');
// Attach FIRST, set `config` LATER — the React `ref` + `useEffect` pattern.
// The grid must render a blank grid (defaulted empty rows/columns) instead of
// crashing on `undefined.length` when connectedCallback runs pre-config.
document.body.appendChild(el);
await new Promise((r) => setTimeout(r, 120)); // let the initial (config-less) render flush
if (!el.querySelector('.bo-grid')) fail('config-less <bo-grid> did not render a (blank) grid after attach');
if (el.querySelectorAll('.bo-grid .row').length !== 0) fail('config-less <bo-grid> unexpectedly rendered rows');

// Now drive it through the `config` property (arrays/functions can't be
// attributes) — exactly how a framework consumer does after mount. Includes a
// JS `render` column (the framework-agnostic custom-cell hook).
el.config = {
  height: 300,
  columns: [
    { type: 'text', key: 'sym', header: 'Symbol' },
    { type: 'price', key: 'px', header: 'Price' },
    { type: 'number', key: 'qty', header: 'Qty', decimals: 0 },
    {
      type: 'custom',
      key: 'dot',
      header: 'Live',
      render: ({ row }) => {
        const b = document.createElement('span');
        b.className = 'js-dot';
        b.textContent = row.qty > 50 ? '● hot' : '○ cold';
        return b;
      },
    },
  ],
  rows: Array.from({ length: 20 }, (_, id) => ({ id, flashSeq: 0, flashDir: 'up', sym: `S${id}`, px: id + 0.5, qty: id * 10 })),
};

await new Promise((r) => setTimeout(r, 200));

const rows = el.querySelectorAll('.bo-grid .row').length;
const headers = el.querySelectorAll('.bo-grid .head .h').length;
if (headers < 4) fail(`custom element rendered no headers (got ${headers})`);
if (rows === 0) fail('custom element rendered no rows');
// JS render hook: the custom column mounted real DOM nodes from plain JS.
const dots = el.querySelectorAll('.bo-grid .js-dot').length;
if (dots === 0) fail('JS render() hook produced no cell nodes in the web component');

// Reactive update through the property: replace the rows, expect the DOM to follow.
el.config = { ...el.config, rows: el.config.rows.slice(0, 5) };
await new Promise((r) => setTimeout(r, 120));
const rows2 = el.querySelectorAll('.bo-grid .row').length;
if (!(rows2 > 0 && rows2 <= rows)) fail(`custom element did not react to a config update (${rows} → ${rows2})`);

// createBoGrid() convenience: element with config preset, then attached.
const made = createBoGrid({ height: 200, columns: el.config.columns, rows: el.config.rows.slice(0, 3) });
if (made.tagName.toLowerCase() !== 'bo-grid') fail('createBoGrid did not return a <bo-grid> element');
document.body.appendChild(made);
await new Promise((r) => setTimeout(r, 120));
const made3 = made.querySelectorAll('.bo-grid .row').length;
if (made3 !== 3) fail(`createBoGrid preset config did not render (got ${made3} rows, want 3)`);

console.log(`✓ wc-smoke: <bo-grid> registered + createBoGrid(); config-after-attach safe (blank→${rows} rows / ${headers} headers); ${dots} JS render() nodes; reactive update ok (${rows}→${rows2}); createBoGrid preset ${made3} rows`);
process.exit(0);
