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

try {
  await import(pathToFileURL(entry).href); // registers <bo-grid>
} catch (e) {
  fail(`importing the element bundle threw: ${e?.stack || e}`);
}

if (!window.customElements.get('bo-grid')) fail('<bo-grid> was not registered with customElements');

const el = document.createElement('bo-grid');
document.body.appendChild(el);
// The whole prop API goes through the `config` property (arrays/functions can't
// be attributes) — exactly how a framework consumer drives it.
el.config = {
  height: 300,
  columns: [
    { type: 'text', key: 'sym', header: 'Symbol' },
    { type: 'price', key: 'px', header: 'Price' },
    { type: 'number', key: 'qty', header: 'Qty', decimals: 0 },
  ],
  rows: Array.from({ length: 20 }, (_, id) => ({ id, flashSeq: 0, flashDir: 'up', sym: `S${id}`, px: id + 0.5, qty: id * 10 })),
};

await new Promise((r) => setTimeout(r, 200));

const rows = el.querySelectorAll('.bo-grid .row').length;
const headers = el.querySelectorAll('.bo-grid .head .h').length;
if (headers < 3) fail(`custom element rendered no headers (got ${headers})`);
if (rows === 0) fail('custom element rendered no rows');

// Reactive update through the property: replace the rows, expect the DOM to follow.
el.config = { ...el.config, rows: el.config.rows.slice(0, 5) };
await new Promise((r) => setTimeout(r, 120));
const rows2 = el.querySelectorAll('.bo-grid .row').length;
if (!(rows2 > 0 && rows2 <= rows)) fail(`custom element did not react to a config update (${rows} → ${rows2})`);

console.log(`✓ wc-smoke: <bo-grid> registered + rendered ${rows} rows / ${headers} headers; reactive config update ok (${rows}→${rows2})`);
process.exit(0);
