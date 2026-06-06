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

// Multi-column sort: a plain header click sorts by one column; Shift-click adds
// a secondary key. Both sorted headers then show an order badge.
const headers = [...document.querySelectorAll('.bo-grid .head .h')];
const clickHdr = (i, shift) =>
  headers[i].dispatchEvent(new window.MouseEvent('click', { button: 0, shiftKey: !!shift, bubbles: true }));
// Use columns with unique keys (price, volume); the demo reuses 'changePct'
// across the percent/heatmap/Signal columns.
clickHdr(1, false); // price — primary, ascending
clickHdr(5, true); // volume — secondary, ascending (additive)
await wait(20);
const sortBadges = document.querySelectorAll('.bo-grid .head .ind .ord').length;
const ascHeaders = headers.filter((h) => h.getAttribute('aria-sort') === 'ascending').length;
if (sortBadges !== 2) fail(`multi-sort should show 2 order badges (got ${sortBadges})`);
if (ascHeaders < 2) fail(`multi-sort should mark 2 headers ascending (got ${ascHeaders})`);
// Reset to unsorted (sole asc → desc → off) so later assertions see natural order.
clickHdr(1, false);
clickHdr(1, false);
clickHdr(1, false);
await wait(20);
if (document.querySelectorAll('.bo-grid .head .ind').length !== 0) fail('sort did not reset to unsorted');

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

// Edit validation: the Target column rejects negatives — an invalid edit keeps
// the previous value.
document.querySelectorAll('.row')[0].querySelectorAll('.c')[TARGET_COL]
  .dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
await wait(40);
const badInput = document.querySelectorAll('.row')[0].querySelector('input.bo-edit');
badInput.value = '-5';
badInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await wait(40);
const afterBad = document.querySelectorAll('.row')[0].querySelectorAll('.c')[TARGET_COL].textContent.trim();
if (afterBad !== '999.99') fail(`validate should reject the negative edit (cell shows "${afterBad}")`);

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

// Type-to-edit (Excel-style): focus an editable cell, press a printable key, and
// the editor opens seeded with that character — no double-click needed.
document.querySelectorAll('.row')[3].querySelectorAll('.c')[TARGET_COL].dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
window.dispatchEvent(new window.Event('pointerup'));
await wait(20);
document.querySelector('.bo-grid.grid').dispatchEvent(
  new window.KeyboardEvent('keydown', { key: '8', bubbles: true }),
);
await wait(40);
const t2eInput = document.querySelector('input.bo-edit');
if (!t2eInput) fail('type-to-edit did not open an editor on a printable key');
if (t2eInput.value !== '8') fail(`type-to-edit did not seed the editor (got "${t2eInput.value}")`);
t2eInput.value = '42.50';
t2eInput.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await wait(40);
const t2eText = document.querySelectorAll('.row')[3].querySelectorAll('.c')[TARGET_COL].textContent.trim();
if (t2eText !== '42.50') fail(`type-to-edit did not commit (cell shows "${t2eText}")`);

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
// onColumnResize callback fired (the demo records it in the toolbar).
if (!document.querySelector('.resize-info')) fail('onColumnResize callback did not fire');
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
if (document.querySelector('.bo-grid.grid')?.getAttribute('aria-label') !== 'Market watchlist') {
  fail('grid ariaLabel not applied');
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

// Keyboard navigation: Home/End move within the row; Ctrl+Home jumps to the
// first cell. The focus is read back off aria-activedescendant.
const gridK = document.querySelector('.bo-grid.grid');
const pressKey = (k, opts = {}) =>
  gridK.dispatchEvent(new window.KeyboardEvent('keydown', { key: k, bubbles: true, ...opts }));
pressKey('Home');
await wait(20);
if (!/-c0$/.test(gridK.getAttribute('aria-activedescendant') || '')) {
  fail(`Home should move focus to column 0 (got ${gridK.getAttribute('aria-activedescendant')})`);
}
pressKey('End');
await wait(20);
if (!/-c8$/.test(gridK.getAttribute('aria-activedescendant') || '')) {
  fail(`End should move focus to the last column (got ${gridK.getAttribute('aria-activedescendant')})`);
}
pressKey('Home', { ctrlKey: true });
await wait(20);
if (gridK.getAttribute('aria-activedescendant') !== `${gridK.id}-r0-c0`) {
  fail(`Ctrl+Home should jump to the first cell (got ${gridK.getAttribute('aria-activedescendant')})`);
}

// Loading overlay: the Reload button flips `loading` for ~800ms.
const reloadBtn = [...document.querySelectorAll('button')].find((b) => /Reload/.test(b.textContent || ''));
if (!reloadBtn) fail('reload control not found in demo');
click(reloadBtn);
await wait(20);
if (!document.querySelector('.bo-grid .loading-overlay')) fail('loading overlay did not show');
await wait(850); // let it clear before the remaining interactions

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
// Right-pinned column: the Target header sticks to the right edge.
const rightPinned = [...document.querySelectorAll('.h')].filter((h) =>
  /right:\s*0px/.test(h.getAttribute('style') || ''),
).length;
if (rightPinned === 0) fail('right-pinning did not produce a right-sticky column');

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

// The non-default examples are lazy chunks, so poll until the expected element
// appears (chunk fetch + mount + reactive flush all settle asynchronously).
const waitFor = async (selector, label) => {
  for (let i = 0; i < 60; i++) {
    if (document.querySelectorAll(selector).length > 0) return;
    await wait(25);
  }
  fail(`${label} (selector "${selector}" never appeared)`);
};

const portfolioTab = tab('Portfolio');
if (!portfolioTab) fail('Portfolio example tab not found');
click(portfolioTab);
await waitFor('.bo-grid .row', 'Portfolio example rendered no rows');
await waitFor('.bo-grid .group', 'Portfolio example did not group by sector');
const portfolioRows = document.querySelectorAll('.bo-grid .row').length;
const portfolioGroups = document.querySelectorAll('.bo-grid .group').length;
// onRowClick: clicking a position row surfaces it in the toolbar.
click(document.querySelector('.bo-grid .row'));
await wait(20);
if (!document.querySelector('.picked')) fail('onRowClick did not surface the clicked position');
// Controlled sort: a header click drives the example's external sort state.
click(document.querySelectorAll('.bo-grid .head .h')[1]);
await wait(20);
if (!document.querySelector('.pill.clear')) fail('controlled sort (onSortChange) did not surface');
click(document.querySelector('.pill.clear'));
await wait(20);
if (document.querySelector('.pill.clear')) fail('clearing controlled sort did not take effect');
// Footer totals row: a pinned row aggregating the columns with groupAgg.
const footerEl = document.querySelector('.bo-grid .footer');
if (!footerEl) fail('footer totals row did not render');
if (!/\d/.test(footerEl.textContent || '')) fail('footer totals row showed no aggregated values');
// Column header groups: a spanning row above the column headers.
const hgroups = [...document.querySelectorAll('.bo-grid .head-groups .hg')].filter(
  (h) => (h.textContent || '').trim().length > 0,
);
if (hgroups.length === 0) fail('column header groups did not render');
// Right-click row menu: contextmenu on a row opens a floating menu of actions.
document.querySelector('.bo-grid .row').dispatchEvent(
  new window.MouseEvent('contextmenu', { bubbles: true, clientX: 80, clientY: 80 }),
);
await wait(20);
const rowmenu = document.querySelector('.rowmenu');
if (!rowmenu || rowmenu.querySelectorAll('.rowmenu-item').length === 0) fail('row context menu did not open');
rowmenu.querySelector('.rowmenu-item').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(20);
if (document.querySelector('.rowmenu')) fail('row menu did not close after selecting an item');
// Keyboard access to the row menu: focus a cell, then the ContextMenu key opens
// the same floating menu (Shift+F10 also works); Esc closes it.
document.querySelector('.bo-grid .c').dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
window.dispatchEvent(new window.Event('pointerup'));
await wait(20);
document.querySelector('.bo-grid.grid').dispatchEvent(
  new window.KeyboardEvent('keydown', { key: 'ContextMenu', bubbles: true }),
);
await wait(20);
const kbMenu = document.querySelector('.rowmenu');
if (!kbMenu || kbMenu.querySelectorAll('.rowmenu-item').length === 0)
  fail('ContextMenu key did not open the row menu from the keyboard');
document.querySelector('.bo-grid.grid').dispatchEvent(
  new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
);
await wait(20);
if (document.querySelector('.rowmenu')) fail('Esc did not close the keyboard-opened row menu');

const sheetTab = tab('Spreadsheet');
if (!sheetTab) fail('Spreadsheet example tab not found');
click(sheetTab);
await wait(25);
await waitFor('.bo-grid .row', 'Spreadsheet example rendered no rows');
const sheetRows = document.querySelectorAll('.bo-grid .row').length;
const sheetLight = /--bo-grid-bg:\s*#fff/i.test(
  document.querySelector('.bo-grid.grid')?.getAttribute('style') || '',
);
if (sheetRows === 0) fail('Spreadsheet example rendered no rows');
if (!sheetLight) fail('Spreadsheet example did not apply the light theme');

// Select editor: the Role column edits via a <select> of options. Double-click a
// role cell and assert a select (not a text input) appears, then commit a change.
const roleCell = document.querySelectorAll('.bo-grid .row')[0].querySelectorAll('.c')[1];
roleCell.dispatchEvent(new window.MouseEvent('dblclick', { bubbles: true }));
await wait(40);
const sel = document.querySelectorAll('.bo-grid .row')[0].querySelector('select.bo-edit');
if (!sel) fail('select editor did not appear for an options column');
sel.value = 'Designer';
sel.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
await wait(40);
const roleAfter = document.querySelectorAll('.bo-grid .row')[0].querySelectorAll('.c')[1].textContent.trim();
if (roleAfter !== 'Designer') fail(`select edit did not commit (cell shows "${roleAfter}")`);

// Cell tooltip: the Name column sets a title attribute of the full value.
const nameCell = document.querySelectorAll('.bo-grid .row')[0].querySelectorAll('.c')[0];
if (!nameCell.getAttribute('title')) fail('tooltip column did not set a cell title');

// Custom formatter: the Salary column renders via format() ($-prefixed).
const salaryCell = document.querySelectorAll('.bo-grid .row')[0].querySelectorAll('.c')[3];
if (!/^\$/.test(salaryCell.textContent.trim())) {
  fail(`column format() not applied (cell shows "${salaryCell.textContent.trim()}")`);
}

// Per-column class hooks: cellClass + headerClass apply to the Team column.
if (!document.querySelector('.bo-grid .c.team-cell')) fail('column cellClass not applied');
if (!document.querySelector('.bo-grid .h.team-head')) fail('column headerClass not applied');

// Master-detail: click a row's expand toggle and assert the detail panel opens.
const expandToggle = document.querySelector('.bo-grid .expand-toggle');
if (!expandToggle) fail('master-detail expand toggle did not render');
expandToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(30);
const detailEl = document.querySelector('.bo-grid .row-detail');
if (!detailEl || !/Salary/.test(detailEl.textContent || '')) fail('detail panel did not open with content');
expandToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(30);
if (document.querySelector('.bo-grid .row-detail')) fail('detail panel did not collapse');

// Row selection: tick one row, then select-all via the header checkbox.
const firstCheck = document.querySelector('.bo-grid .row .rowcheck');
if (!firstCheck) fail('row-selection checkbox did not render');
firstCheck.click();
await wait(20);
if (!document.querySelector('.bo-grid .row.rowsel')) fail('ticking a row did not select it');
const selAll = document.querySelector('.bo-grid .selhead .rowcheck');
if (!selAll) fail('select-all header checkbox did not render');
selAll.click();
await wait(20);
const selectedRows = document.querySelectorAll('.bo-grid .row.rowsel').length;
if (selectedRows < 2) fail(`select-all did not select the visible rows (${selectedRows})`);
// Keyboard row-selection: focus a cell, then Space toggles that row's checkbox.
const kbRow = document.querySelector('.bo-grid .row');
const wasSel = kbRow.classList.contains('rowsel');
kbRow.querySelector('.c').dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
window.dispatchEvent(new window.Event('pointerup'));
await wait(20);
document.querySelector('.bo-grid.grid').dispatchEvent(
  new window.KeyboardEvent('keydown', { key: ' ', bubbles: true }),
);
await wait(20);
if (document.querySelector('.bo-grid .row').classList.contains('rowsel') === wasSel)
  fail('Space did not toggle row selection of the focused row');

// onCellClick: clicking a cell reports its column + value to the toolbar.
click(document.querySelector('.bo-grid .row .c'));
await wait(20);
if (!document.querySelector('.lastcell')) fail('onCellClick did not report the clicked cell');

// Column show/hide: open the picker and hide a column, assert a header drops.
const colsBefore = document.querySelectorAll('.bo-grid .head .h').length;
const colBtn = [...document.querySelectorAll('.colbtn')].find((b) => b.textContent.includes('Columns'));
if (!colBtn) fail('column-picker button not found');
colBtn.click();
await wait(20);
const colItem = document.querySelector('.colmenu .menu .item input');
if (!colItem) fail('column-picker menu did not open');
colItem.click(); // hide the first column
await wait(20);
const colsAfter = document.querySelectorAll('.bo-grid .head .h').length;
if (colsAfter !== colsBefore - 1) fail(`hiding a column should drop one header (${colsBefore} → ${colsAfter})`);

// Per-column filter row: typing in a column's input narrows the rows.
const roleFilter = document.querySelector('.bo-grid .filter-row [aria-label="Filter Role"]');
if (!roleFilter) fail('per-column filter input did not render');
const frBefore = document.querySelectorAll('.bo-grid .row').length;
roleFilter.value = 'Engineer';
roleFilter.dispatchEvent(new window.Event('input', { bubbles: true }));
await wait(30);
const frAfter = document.querySelectorAll('.bo-grid .row').length;
if (!(frAfter < frBefore)) fail(`column filter did not narrow rows (${frBefore} → ${frAfter})`);
// emptyMessage: filter to nothing and assert the custom empty state shows.
roleFilter.value = 'zzzzzz';
roleFilter.dispatchEvent(new window.Event('input', { bubbles: true }));
await wait(30);
const emptyEl = document.querySelector('.bo-grid .empty');
if (!emptyEl || !/no people match/i.test(emptyEl.textContent || '')) {
  fail(`custom emptyMessage did not show (got "${emptyEl?.textContent}")`);
}
roleFilter.value = ''; // clear so later state is clean
roleFilter.dispatchEvent(new window.Event('input', { bubbles: true }));
await wait(20);

// Pagination: toggle paged mode and step through pages via the pager.
const pageToggle = [...document.querySelectorAll('.colbtn')].find((b) => /Scroll|Paged/.test(b.textContent || ''));
if (!pageToggle) fail('pagination toggle not found');
pageToggle.click();
await wait(30);
const pager = document.querySelector('.bo-grid .pager');
if (!pager || !/Page 1 of/.test(pager.textContent || '')) fail(`pager did not render (got "${pager?.textContent}")`);
const nextBtn = [...pager.querySelectorAll('.pg')].find((b) => /Next/.test(b.textContent || ''));
nextBtn.click();
await wait(30);
if (!/Page 2 of/.test(document.querySelector('.bo-grid .pager')?.textContent || '')) {
  fail('pager Next did not advance the page');
}

// Order book: per-row colour classes (ask/bid) via rowClass + custom depth cell.
const obTab = tab('Order book');
if (!obTab) fail('Order book example tab not found');
click(obTab);
await wait(50);
await waitFor('.bo-grid .row.ask', 'Order book did not apply ask rowClass');
const obAsk = document.querySelectorAll('.bo-grid .row.ask').length;
const obBid = document.querySelectorAll('.bo-grid .row.bid').length;
const obDepth = document.querySelectorAll('.bo-grid .row .depth .fill').length;
if (obBid === 0) fail('Order book did not apply bid rowClass');
if (obDepth === 0) fail('Order book custom depth-bar cell did not render');

// Correlation: an N×N heatmap matrix with a pinned label column.
const corrTab = tab('Correlation');
if (!corrTab) fail('Correlation example tab not found');
click(corrTab);
await wait(50);
await waitFor('.bo-grid .row', 'Correlation example rendered no rows');
const heatCells = [...document.querySelectorAll('.bo-grid .row .c')].filter((c) =>
  /background:\s*(rgb|#|hsl|oklch)/i.test(c.getAttribute('style') || ''),
).length;
const corrPinned = [...document.querySelectorAll('.bo-grid .row .c')].filter((c) =>
  /position:\s*sticky/.test(c.getAttribute('style') || ''),
).length;
if (heatCells === 0) fail('Correlation matrix rendered no heatmap-coloured cells');
if (corrPinned === 0) fail('Correlation matrix label column did not pin');

// Leaderboard: custom rank/progress cells + podium row highlighting.
const lbTab = tab('Leaderboard');
if (!lbTab) fail('Leaderboard example tab not found');
click(lbTab);
await wait(50);
await waitFor('.bo-grid .row', 'Leaderboard example rendered no rows');
const lbBars = document.querySelectorAll('.bo-grid .row .bar .fill').length;
const lbPodium = document.querySelectorAll('.bo-grid .row.podium-row').length;
const lbPinned = document.querySelectorAll('.bo-grid .pinned-top .pinrow').length;
if (lbBars === 0) fail('Leaderboard score bars (custom cell) did not render');
if (lbPodium === 0) fail('Leaderboard podium rowClass did not apply');
if (lbPinned === 0) fail('Leaderboard pinned "You" row did not render');

// Tree data: roots render collapsed; expanding a folder reveals children.
const treeTab = tab('Tree');
if (!treeTab) fail('Tree example tab not found');
click(treeTab);
await wait(50);
await waitFor('.bo-grid .row', 'Tree example rendered no rows');
const treeRootsCount = document.querySelectorAll('.bo-grid .row').length;
const treeToggle = document.querySelector('.bo-grid .tree-toggle');
if (!treeToggle) fail('tree expand toggle did not render');
treeToggle.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
await wait(30);
const treeAfter = document.querySelectorAll('.bo-grid .row').length;
if (!(treeAfter > treeRootsCount)) fail(`expanding a tree node did not reveal children (${treeRootsCount} → ${treeAfter})`);
// Treegrid a11y: the expanded node carries aria-expanded; ArrowLeft collapses it.
if (document.querySelector('.bo-grid .row[aria-expanded="true"]') == null) fail('expanded tree row missing aria-expanded');
const treeGridK = document.querySelector('.bo-grid.grid');
document.querySelectorAll('.bo-grid .row')[0].querySelector('.c').dispatchEvent(
  new window.MouseEvent('pointerdown', { button: 0, bubbles: true }),
);
window.dispatchEvent(new window.Event('pointerup'));
treeGridK.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
await wait(30);
if (document.querySelectorAll('.bo-grid .row').length !== treeRootsCount) {
  fail('ArrowLeft did not collapse the focused tree node');
}

// Row reorder: drag the first row's handle and drop it onto a later row.
const tasksTab = tab('Tasks');
if (!tasksTab) fail('Tasks example tab not found');
click(tasksTab);
await wait(50);
await waitFor('.bo-grid .row .drag-handle', 'Tasks drag handle did not render');
const taskFirstBefore = document.querySelector('.bo-grid .row .c').textContent.trim();
const taskRows = document.querySelectorAll('.bo-grid .row');
taskRows[0].querySelector('.drag-handle').dispatchEvent(new window.Event('dragstart', { bubbles: true }));
await wait(10);
taskRows[2].dispatchEvent(new window.Event('dragover', { bubbles: true, cancelable: true }));
taskRows[2].dispatchEvent(new window.Event('drop', { bubbles: true }));
await wait(30);
const taskFirstAfter = document.querySelector('.bo-grid .row .c').textContent.trim();
if (taskFirstAfter === taskFirstBefore) fail(`row reorder did not change the order (still "${taskFirstAfter}")`);

// Big data: a 1,000,000-row windowed source. Assert real (non-skeleton) rows
// load after the simulated latency and the scrollbar reflects the full total.
const bigTab = tab('1M rows');
if (!bigTab) fail('1M rows example tab not found');
click(bigTab);
await wait(50); // let the previous example tear down before we read the new grid
// Poll until the windowed source has resolved its total (spacer height grows to
// cover all 1,000,000 rows) — total lands a tick after the first window.
const bigHeightOf = () => parseInt(document.querySelector('.bo-grid .spacer')?.style.height || '0', 10);
let bigHeight = 0;
for (let i = 0; i < 80; i++) {
  bigHeight = bigHeightOf();
  if (bigHeight > 1_000_000) break;
  await wait(25);
}
const bigRows = document.querySelectorAll('.bo-grid .row:not(.skeleton)').length;
// 1,000,000 rows × 36px ≈ 36,000,000px of virtual scroll height.
if (bigHeight < 1_000_000) fail(`1M-rows scroll height too small for the dataset (${bigHeight}px)`);
if (bigRows === 0) fail('1M-rows example loaded no windowed rows');

console.log(
  `✓ smoke: grid mounted — ${rowCount} rows, ${canvases} sparklines; ` +
    `multi-sort 2 keys; selection ${selCount} cells + agg bar; grouping ${groupHeaders} headers, ` +
    `edit committed + validate; variable heights ${rowHeights.join('/')}; ` +
    `paste + resize committed (+onColumnResize); collapse ${heightBefore}→${heightAfter}px; server loaded ${dataRows} rows; ` +
    `${stickyHeaders} pinned columns (+right); pivot ${pivotHeaders.length} cols; ` +
    `gallery: portfolio ${portfolioRows} rows/${portfolioGroups} groups + header-groups + ctx-menu, sheet ${sheetRows} rows (light) + select-edit + row-select + col-hide + col-filter + empty-msg + master-detail + cell-class + pagination, ` +
    `orderbook ${obAsk}↑/${obBid}↓ + ${obDepth} depth bars, correlation ${heatCells} heat cells/${corrPinned} pinned, leaderboard ${lbBars} bars/${lbPodium} podium/${lbPinned} pinned, tree ${treeRootsCount}→${treeAfter} on expand +kbd-collapse, tasks row-reorder ok, bigdata ${bigRows} windowed rows over ${bigHeight.toLocaleString()}px; ` +
    `keyboard Home/End/Ctrl+Home ok; loading overlay ok; a11y rowcount/activedescendant ok`,
);
process.exit(0);
