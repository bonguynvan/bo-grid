import type { Component } from 'svelte';
import TradingDesk from './TradingDesk.svelte';

export interface Example {
  id: string;
  title: string;
  /** Shown next to the logo when the example is active. */
  blurb: string;
  /** Eagerly bundled component (the default tab). */
  component?: Component;
  /** Lazy chunk, imported on first activation — keeps the entry bundle lean so
      the gallery can grow without inflating the core demo download. */
  load?: () => Promise<{ default: Component }>;
}

// Only the default example ships in the entry chunk; the rest are code-split and
// fetched on demand. CSS is merged into one file (build.cssCodeSplit: false) so
// the lazy JS chunks have no stylesheet to preload.
export const EXAMPLES: Example[] = [
  {
    id: 'trading',
    title: 'Trading desk',
    blurb: 'Sparklines, realtime flash & heatmaps over 1,000 virtualized rows.',
    component: TradingDesk,
  },
  {
    id: 'portfolio',
    title: 'Portfolio',
    blurb: 'Positions grouped by sector with live subtotals, P&L heatmap & pivot.',
    load: () => import('./Portfolio.svelte'),
  },
  {
    id: 'sheet',
    title: 'Spreadsheet',
    blurb: 'A general-purpose editable grid — inline edit, copy/paste, resize.',
    load: () => import('./Sheet.svelte'),
  },
  {
    id: 'orderbook',
    title: 'Order book',
    blurb: 'A live depth ladder — per-row colour, depth bars, realtime size flashes.',
    load: () => import('./OrderBook.svelte'),
  },
  {
    id: 'correlation',
    title: 'Correlation',
    blurb: 'An N×N heatmap matrix with a pinned label column and dynamic columns.',
    load: () => import('./Correlation.svelte'),
  },
  {
    id: 'leaderboard',
    title: 'Leaderboard',
    blurb: 'Rank medals and score bars (custom cells), podium row highlighting.',
    load: () => import('./Leaderboard.svelte'),
  },
  {
    id: 'team',
    title: 'Team',
    blurb: 'A people/CRM board — avatars, status badges, progress, ratings, tags (rich cell types).',
    load: () => import('./Team.svelte'),
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    blurb: 'KPI cards and in-cell charts via the bo-grid/charts companion (line, bar, donut).',
    load: () => import('./Dashboard.svelte'),
  },
  {
    id: 'wide',
    title: 'Wide',
    blurb: '60+ columns with horizontal column virtualization and a pinned label column.',
    load: () => import('./WideGrid.svelte'),
  },
  {
    id: 'tree',
    title: 'Tree',
    blurb: 'A file-explorer tree — expandable folders, indented rows (tree data).',
    load: () => import('./Tree.svelte'),
  },
  {
    id: 'tasks',
    title: 'Tasks',
    blurb: 'A drag-to-reorder task list (row reordering via a handle).',
    load: () => import('./Tasks.svelte'),
  },
  {
    id: 'bigdata',
    title: '1M rows',
    blurb: 'A million-row trade tape, windowed from a synthetic source on demand.',
    load: () => import('./BigData.svelte'),
  },
];
