// Entry for the `bo-grid` custom element. Importing this module registers
// `<bo-grid>` with the browser (Svelte does the `customElements.define` when the
// component compiles with `<svelte:options customElement>`).
//
//   import 'bo-grid/element';
//   const el = document.querySelector('bo-grid');
//   el.config = { rows, columns, theme: 'dark' };
//
// Works in React, Vue, Angular and vanilla — see docs/frameworks.md.
import BoGrid from './BoGrid.svelte';

// Reference the import so bundlers keep it (the side effect is registration).
export default BoGrid;
