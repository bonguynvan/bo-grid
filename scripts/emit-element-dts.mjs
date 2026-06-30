// The web-component entry (src/wc/element.ts) is bundled by Vite, which doesn't
// emit type declarations. Hand-write dist/bo-grid.element.d.ts so consumers get
// a typed `config`, a `BoGridElement` interface and the `createBoGrid` helper —
// importing GridProps from the sibling dist/index.d.ts (svelte-package output).
import { writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const out = resolve('dist/bo-grid.element.d.ts');
if (!existsSync(resolve('dist/index.d.ts'))) {
  console.error('emit-element-dts: dist/index.d.ts missing — run svelte-package first');
  process.exit(1);
}

const dts = `// Type declarations for the \`bo-grid/element\` entry (the <bo-grid> custom element).
import type { GridProps } from './index';

/** The <bo-grid> \`config\` object — every <Grid> prop. */
export type BoGridConfig = GridProps;

/** A <bo-grid> DOM element with a typed \`config\` property. */
export interface BoGridElement extends HTMLElement {
  config?: BoGridConfig;
}

/** Create a <bo-grid> element with its \`config\` already set (safe
 *  create-before-attach pattern for React/Vue/vanilla). */
export function createBoGrid(config?: BoGridConfig): BoGridElement;

declare const BoGrid: unknown;
export default BoGrid;
`;

writeFileSync(out, dts);
console.log('emit-element-dts: wrote dist/bo-grid.element.d.ts');
