// Headless mount smoke-test: build the demo, mount it in jsdom (with a canvas
// stub), and assert that real rows render. Catches the class of runtime bug —
// reactive loops, mount throws, blank pages — that a build + type-check cannot.
import { JSDOM } from 'jsdom';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';

const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.customElements = window.customElements;
for (const k of Object.getOwnPropertyNames(window)) {
  if (k in globalThis) continue;
  try {
    globalThis[k] = window[k];
  } catch {}
}
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = globalThis.requestAnimationFrame;
window.cancelAnimationFrame = globalThis.cancelAnimationFrame;
window.devicePixelRatio = 2;
if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
}
// jsdom has no 2D canvas; stub the methods the sparkline uses.
window.HTMLCanvasElement.prototype.getContext = () => ({
  setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fillRect() {}, save() {}, restore() {},
  set strokeStyle(_v) {}, set fillStyle(_v) {}, set lineWidth(_v) {},
});

// jsdom has no clipboard; stub read/write so copy/paste can be exercised.
// The bundle's bare `navigator` resolves to Node's global navigator (no
// clipboard), so stub it on every navigator the code might reach.
let clipboardText = '';
const clipboardStub = {
  writeText: async (t) => { clipboardText = String(t); },
  readText: async () => clipboardText,
};
for (const nav of [window.navigator, globalThis.navigator]) {
  if (!nav) continue;
  try {
    Object.defineProperty(nav, 'clipboard', { configurable: true, value: clipboardStub });
  } catch {}
}

function fail(msg) {
  console.error(`✗ smoke: ${msg}`);
  process.exit(1);
}

process.on('unhandledRejection', (e) => fail(`unhandled rejection: ${e?.message || e}`));

const bundle = readdirSync('demo-dist/assets').find((f) => f.endsWith('.js'));
if (!bundle) fail('no built bundle in demo-dist/assets — run the demo build first');
const url = pathToFileURL(resolve('demo-dist/assets', bundle)).href;

try {
  await import(url);
} catch (e) {
  fail(`mount threw: ${e?.stack || e}`);
}
await new Promise((r) => setTimeout(r, 600));

const rowCount = document.querySelectorAll('.row').length;
const hasHeader = !!document.querySelector('.bo-grid .head');
const canvases = document.querySelectorAll('canvas').length;

if (!hasHeader) fail('grid header did not render');
if (rowCount === 0) fail('no rows rendered (blank grid)');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const click = (el) => el.dispatchEvent(new window.MouseEvent('click', { button: 0, bubbles: true }));

// Custom cell renderer (snippet): the Signal column renders a pill.
if (!document.querySelector('.signal')) fail('custom cell snippet did not render');

// Inline editing (Phase 5): double-click the editable Target cell, type a value,
// press Enter, and assert it commits.
const TARGET_COL = 6;
const firstRow = document.querySelectorAll('.row')[0];
firstRow
  .querySelectorAll('.c')
  [TARGET_COL].dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
await wait(40);
const editInput = firstRow.querySelector('input.bo-edit');
if (!editInput) fail('inline-edit input did not appear on double-click');
editInput.value = '999.99';
editInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await wait(40);
const editedText = document.querySelectorAll('.row')[0].querySelectorAll('.c')[TARGET_COL].textContent.trim();
if (editedText !== '999.99') fail(`inline edit did not commit (cell shows "${editedText}")`);

// Clipboard paste (Phase 5): select the Target cell on row 1, put a value on the
// clipboard, press Ctrl+V, and assert it commits through the same edit path.
const gridForPaste = document.querySelector('.bo-grid.grid');
const pasteRow = document.querySelectorAll('.row')[1];
pasteRow.querySelectorAll('.c')[TARGET_COL].dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
window.dispatchEvent(new window.Event('pointerup'));
clipboardText = '123.45';
gridForPaste.dispatchEvent(
  new window.KeyboardEvent('keydown', { key: 'v', ctrlKey: true, bubbles: true }),
);
await wait(60);
const pastedText = document.querySelectorAll('.row')[1].querySelectorAll('.c')[TARGET_COL].textContent.trim();
if (pastedText !== '123.45') fail(`clipboard paste did not commit (cell shows "${pastedText}")`);

// Column resize (Phase 5): drag the Price header's grip and assert the header
// switches to an explicit pixel width. jsdom reports a 0px rect, so the dragged
// delta becomes the new width directly.
const RESIZE_COL = 1;
const resizeHead = document.querySelectorAll('.h')[RESIZE_COL];
const grip = resizeHead.querySelector('.grip');
if (!grip) fail('resize grip did not render on header');
const widthBefore = resizeHead.getAttribute('style') || '';
grip.dispatchEvent(new window.MouseEvent('pointerdown', { button: 0, clientX: 0, bubbles: true }));
window.dispatchEvent(new window.MouseEvent('pointermove', { clientX: 150, bubbles: true }));
window.dispatchEvent(new window.MouseEvent('pointerup', { clientX: 150, bubbles: true }));
await wait(40);
const widthAfter = document.querySelectorAll('.h')[RESIZE_COL].getAttribute('style') || '';
if (!/150px/.test(widthAfter)) {
  fail(`column resize did not apply a 150px width (before="${widthBefore}" after="${widthAfter}")`);
}
// Double-click the grip clears the override back to the default width.
document.querySelectorAll('.h')[RESIZE_COL]
  .querySelector('.grip')
  .dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
await wait(40);
const widthReset = document.querySelectorAll('.h')[RESIZE_COL].getAttribute('style') || '';
if (/150px/.test(widthReset)) fail(`double-click did not reset the column width (style="${widthReset}")`);

// Variable row height (Phase 5): switch to 'Vary' and assert rendered rows have
// differing heights, then restore 'Compact' for the remaining assertions.
const varyBtn = [...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'Vary');
if (!varyBtn) fail('row-height control not found in demo');
click(varyBtn);
await wait(40);
const rowHeights = [...document.querySelectorAll('.row')].slice(0, 6).map((r) =>
  parseInt(r.style.height, 10),
);
if (new Set(rowHeights).size < 2) fail(`variable row heights did not apply (${rowHeights.join(',')})`);
click([...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'Compact'));
await wait(40);

// Accessibility: grid exposes true dimensions despite virtualization, and
// rows/cells carry 1-based aria indices.
const gridEl = document.querySelector('.bo-grid.grid');
if (gridEl.getAttribute('aria-rowcount') !== '1001') {
  fail(`aria-rowcount should be 1001 (got ${gridEl.getAttribute('aria-rowcount')})`);
}
if (gridEl.getAttribute('aria-colcount') !== '9') {
  fail(`aria-colcount should be 9 (got ${gridEl.getAttribute('aria-colcount')})`);
}
const ariaRow = document.querySelector('.row[aria-rowindex]');
if (!ariaRow || !ariaRow.querySelector('.c[aria-colindex]')) {
  fail('rows/cells missing aria-rowindex/aria-colindex');
}

// Theming (Phase 5): switch to the light preset and assert the grid root carries
// the --bo-grid-bg override, then restore dark.
click([...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'Light'));
await wait(40);
const gridStyle = document.querySelector('.bo-grid.grid')?.getAttribute('style') || '';
if (!/--bo-grid-bg:\s*#fff/i.test(gridStyle)) {
  fail(`light theme did not apply --bo-grid-bg (style="${gridStyle.slice(0, 60)}…")`);
}
click([...document.querySelectorAll('.seg button')].find((b) => b.textContent.trim() === 'Dark'));
await wait(40);

// Simulate a drag-selection down the Price column and assert the highlight +
// live aggregation bar appear (Phase 2). Catches selection wiring regressions.
const rowEls = document.querySelectorAll('.row');
const cellOf = (rowEl, c) => rowEl.querySelectorAll('.c')[c];
const PRICE_COL = 1;
cellOf(rowEls[0], PRICE_COL).dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
cellOf(rowEls[3], PRICE_COL).dispatchEvent(new window.MouseEvent('pointerenter', { bubbles: true }));
window.dispatchEvent(new window.Event('pointerup'));
await new Promise((r) => setTimeout(r, 50));

const selCount = document.querySelectorAll('.c.sel').length;
const hasAgg = !!document.querySelector('.agg');
if (selCount < 2) fail(`drag-selection produced ${selCount} highlighted cells (expected ≥2)`);
if (!hasAgg) fail('aggregation bar did not appear for a multi-cell selection');

// a11y: the focus cell is exposed to AT via aria-activedescendant.
const adesc = document.querySelector('.bo-grid.grid').getAttribute('aria-activedescendant');
if (!adesc || !document.getElementById(adesc)) {
  fail(`aria-activedescendant not set to a live focus cell (${adesc})`);
}

// Grouping (Phase 3): switch the demo to group-by-sector, assert group-header
// rows render, then collapse one group and assert the scroll height shrinks.
const sectorBtn = [...document.querySelectorAll('.seg button')].find(
  (b) => b.textContent.trim() === 'Sector',
);
if (!sectorBtn) fail('group-by control not found in demo');
click(sectorBtn);
await wait(60);

const groupHeaders = document.querySelectorAll('.group').length;
if (groupHeaders === 0) fail('grouping produced no group-header rows');

const hasSticky = !!document.querySelector('.sticky .group');
if (!hasSticky) fail('sticky group header did not render');

const spacer = document.querySelector('.spacer');
const heightBefore = parseInt(spacer.style.height, 10);
click(document.querySelector('.group .toggle'));
await wait(60);
const heightAfter = parseInt(spacer.style.height, 10);
if (!(heightAfter < heightBefore)) {
  fail(`collapsing a group did not shrink scroll height (${heightBefore} → ${heightAfter})`);
}

// Server-side data source (Phase 4): switch to the async windowed source and
// assert it loads real rows (skeletons → data) after the simulated latency.
const serverBtn = [...document.querySelectorAll('.seg button')].find(
  (b) => b.textContent.trim() === 'Server',
);
if (!serverBtn) fail('data-mode control not found in demo');
click(serverBtn);
await wait(700); // simulated source latency is ~220ms

const dataRows = document.querySelectorAll('.row:not(.skeleton)').length;
const serverHeight = parseInt(document.querySelector('.spacer').style.height, 10);
if (dataRows === 0) fail('server-mode source did not load any data rows');
if (!(serverHeight > 0)) fail('server-mode total/scroll height not set from source');

// Pinned columns (Phase 4): toggle pinning and assert sticky-positioned headers.
const pinBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pin L');
if (!pinBtn) fail('pin control not found in demo');
click(pinBtn);
await wait(80);
const stickyHeaders = [...document.querySelectorAll('.h')].filter((h) =>
  /position:\s*sticky/.test(h.getAttribute('style') || ''),
).length;
if (stickyHeaders === 0) fail('pinning did not produce sticky columns');

// Pivot (Phase 5): toggle pivot and assert the columns become the pivot output.
const pivotBtn = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pivot');
if (!pivotBtn) fail('pivot control not found in demo');
click(pivotBtn);
await wait(60);
const pivotHeaders = [...document.querySelectorAll('.h .label')].map((n) => n.textContent.trim());
if (!pivotHeaders.includes('Total') || !pivotHeaders.includes('sector')) {
  fail(`pivot did not produce expected columns (got ${pivotHeaders.join(',')})`);
}

// Examples gallery: switch tabs and assert each alternative example actually
// mounts a populated grid (the default "Trading desk" was exercised above).
const tab = (label) =>
  [...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === label);

const portfolioTab = tab('Portfolio');
if (!portfolioTab) fail('Portfolio example tab not found');
click(portfolioTab);
await wait(80);
const portfolioRows = document.querySelectorAll('.bo-grid .row').length;
const portfolioGroups = document.querySelectorAll('.bo-grid .group').length;
if (portfolioRows === 0) fail('Portfolio example rendered no rows');
if (portfolioGroups === 0) fail('Portfolio example did not group by sector');

const sheetTab = tab('Spreadsheet');
if (!sheetTab) fail('Spreadsheet example tab not found');
click(sheetTab);
await wait(80);
const sheetRows = document.querySelectorAll('.bo-grid .row').length;
const sheetLight = /--bo-grid-bg:\s*#fff/i.test(
  document.querySelector('.bo-grid.grid')?.getAttribute('style') || '',
);
if (sheetRows === 0) fail('Spreadsheet example rendered no rows');
if (!sheetLight) fail('Spreadsheet example did not apply the light theme');

console.log(
  `✓ smoke: grid mounted — ${rowCount} rows, ${canvases} sparklines; ` +
    `selection ${selCount} cells + agg bar; grouping ${groupHeaders} headers, ` +
    `edit committed; variable heights ${rowHeights.join('/')}; ` +
    `paste + resize committed; collapse ${heightBefore}→${heightAfter}px; server loaded ${dataRows} rows; ` +
    `${stickyHeaders} pinned columns; pivot ${pivotHeaders.length} cols; ` +
    `gallery: portfolio ${portfolioRows} rows/${portfolioGroups} groups, sheet ${sheetRows} rows (light); ` +
    `a11y rowcount/activedescendant ok`,
);
process.exit(0);
