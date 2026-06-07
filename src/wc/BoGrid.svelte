<!--
  Web Component wrapper: compiles <Grid> as a framework-agnostic custom element
  `<bo-grid>` usable from React, Vue, Angular or vanilla JS/HTML.

  The whole prop API is passed through a single `config` property (set it in JS:
  `el.config = { rows, columns, theme, ... }`) since custom-element attributes
  can't carry arrays/functions. `shadow: 'none'` renders to light DOM so page
  CSS variables (--bo-grid-*) and the grid's styles apply normally.

  Limitation: the `cell` / `detail` *snippets* (custom cell rendering) can't be
  passed from plain JS — use built-in column types, `format`, or computed `value`
  instead. Everything else (sorting, filtering, grouping, selection, editing,
  conditional formatting, virtualization, trees, themes…) works.
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
