# Using bo-grid in React, Vue, Angular & vanilla

bo-grid is a Svelte 5 component, but it also ships a framework-agnostic **custom
element** (`<bo-grid>`) so you can use it anywhere.

```js
import 'bo-grid/element'; // registers <bo-grid> (styles inject automatically)
```

> **Runnable starters:** [`examples/`](../examples/) has build-free HTML files for
> [vanilla](../examples/vanilla.html), [React](../examples/react.html) and
> [Vue](../examples/vue.html) — `npx serve examples` and open one.

The element takes the **whole grid API through a single `config` property** — set
it in JS (arrays and functions can't be HTML attributes). Updating `config`
re-renders reactively.

```js
const el = document.querySelector('bo-grid');
el.config = {
  height: 520,
  theme: 'dark',
  columns: [
    { type: 'text', key: 'symbol', header: 'Symbol' },
    { type: 'price', key: 'price', header: 'Price' },
    { type: 'percent', key: 'changePct', header: 'Chg %' },
  ],
  rows: data,
  rowSelection: true,
  filterMenu: true,
  onCellEdit: (e) => console.log(e),
};
```

> **Limitation:** the `cell` / `detail` **snippets** (fully custom cell rendering)
> can't be passed from plain JS — they're a Svelte compile-time feature. Use the
> built-in column types, a `format` function, or a computed `value` instead, which
> cover the vast majority of cases. Everything else — sorting, filtering, grouping,
> selection, inline editing, conditional formatting, computed columns, rich types,
> column virtualization, trees, lazy/server data, theming — works.

## React

```tsx
import { useEffect, useRef } from 'react';
import 'bo-grid/element';

export function Grid({ columns, rows, ...rest }) {
  const ref = useRef<HTMLElement & { config?: unknown }>(null);
  useEffect(() => {
    if (ref.current) ref.current.config = { columns, rows, ...rest };
  }, [columns, rows, rest]);
  return <bo-grid ref={ref} style={{ display: 'block' }} />;
}
```

In TypeScript, declare the tag once:

```tsx
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'bo-grid': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
```

## Vue 3

Tell Vue `bo-grid` is a custom element (in `vite.config`:
`vue({ template: { compilerOptions: { isCustomElement: (t) => t === 'bo-grid' } } })`),
then bind `config` as a property:

```vue
<script setup>
import 'bo-grid/element';
const config = { columns, rows, theme: 'dark', filterMenu: true };
</script>

<template>
  <bo-grid :config.prop="config" />
</template>
```

## Angular

Add `CUSTOM_ELEMENTS_SCHEMA` to the module/component, then bind the property:

```ts
import 'bo-grid/element';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// @Component({ schemas: [CUSTOM_ELEMENTS_SCHEMA], template: `<bo-grid [config]="config"></bo-grid>` })
```

```html
<bo-grid [config]="config"></bo-grid>
```

## Vanilla HTML/JS

```html
<script type="module">
  import 'bo-grid/element';
  const el = document.createElement('bo-grid');
  el.config = { columns, rows, height: 520 };
  document.body.append(el);
</script>
```

## Notes

- The element renders to **light DOM** (`shadow: 'none'`), so your `--bo-grid-*`
  CSS variables and page styles apply normally, and the bundle injects its own
  styles on import — no separate stylesheet to include.
- The bundle is self-contained (it includes the Svelte runtime), so it's larger
  than the native Svelte import (~60 KB gzip). If you're already in Svelte, import
  the component directly (`import { Grid } from 'bo-grid'`) instead — it's far
  smaller and supports the `cell`/`detail` snippets.
- Client-only (custom elements need the DOM); guard SSR with a dynamic import in
  `onMount`/`useEffect`.
