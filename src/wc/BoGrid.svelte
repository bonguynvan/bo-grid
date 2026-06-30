<!--
  Web Component wrapper: compiles <Grid> as a framework-agnostic custom element
  `<bo-grid>` usable from React, Vue, Angular or vanilla JS/HTML.

  The whole prop API is passed through a single `config` property (set it in JS:
  `el.config = { rows, columns, theme, ... }`) since custom-element attributes
  can't carry arrays/functions. `shadow: 'none'` renders to light DOM so page
  CSS variables (--bo-grid-*) and the grid's styles apply normally.

  `config` is safe to set after the element attaches (the React `ref` +
  `useEffect` pattern): the grid defaults to empty `rows`/`columns` and renders a
  blank grid until `config` arrives, then reacts.

  For rich cells from plain JS, give a column a `render(ctx)` function returning
  an `HTMLElement` or HTML string — the framework-agnostic alternative to the
  Svelte `cell` snippet. Everything else (sorting, filtering, grouping,
  selection, editing, conditional formatting, virtualization, trees, themes…)
  works.
-->
<svelte:options
  customElement={{ tag: 'bo-grid', shadow: 'none', props: { config: { type: 'Object' } } }}
/>

<script lang="ts">
  import Grid from '../lib/grid/Grid.svelte';
  import type { ComponentProps } from 'svelte';

  let { config = {} as ComponentProps<typeof Grid> }: { config?: ComponentProps<typeof Grid> } = $props();
</script>

<Grid {...config} />
