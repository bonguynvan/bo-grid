// Type check of the published declarations under moduleResolution "nodenext"
// (the default of `tsc --init`), run by `pnpm smoke:node` after a build. There,
// a relative import without its `.js` extension doesn't resolve, and every type
// behind it turns into `any`. The @ts-expect-error lines fail the check if a
// type turns into `any`; tsconfig.node.json also checks dist itself.
import { createElement } from 'react';
import { resolveColumns, type ColumnDef } from 'bo-grid';
import { BoGrid as ReactGrid } from 'bo-grid/react';
import { BoGrid as VueGrid } from 'bo-grid/vue';
import { createBoGrid } from 'bo-grid/element';
import { createOrderBook } from 'bo-grid/realtime';
import { roundToTick } from 'bo-grid/trading';
import type { DepthLadder } from 'bo-grid/ladder';

const columns: ColumnDef[] = resolveColumns([{ type: 'text', key: 'sym', header: 'Sym' }]);
createElement(ReactGrid, { rows: [], columns, height: 300 });

// @ts-expect-error a function, not a symbol
export const a: symbol = resolveColumns;
// @ts-expect-error rows is an array
createElement(ReactGrid, { rows: 5, columns: [] });
// @ts-expect-error a component, not a symbol
export const b: symbol = VueGrid;
// @ts-expect-error a function, not a symbol
export const c: symbol = createBoGrid;
// @ts-expect-error a function, not a symbol
export const d: symbol = createOrderBook;
// @ts-expect-error a function, not a symbol
export const e: symbol = roundToTick;
// @ts-expect-error a component, not a symbol
export const f: symbol = null as unknown as typeof DepthLadder;
