import type { Component } from 'svelte';
import TradingDesk from './TradingDesk.svelte';
import Portfolio from './Portfolio.svelte';
import Sheet from './Sheet.svelte';

export interface Example {
  id: string;
  title: string;
  /** Shown next to the logo when the example is active. */
  blurb: string;
  component: Component;
}

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
    component: Portfolio,
  },
  {
    id: 'sheet',
    title: 'Spreadsheet',
    blurb: 'A general-purpose editable grid — inline edit, copy/paste, resize.',
    component: Sheet,
  },
];
