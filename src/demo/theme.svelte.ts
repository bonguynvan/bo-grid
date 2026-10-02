import { tradecanvasTheme, tradecanvasLightTheme, type GridTheme } from '../lib';

// Shared demo UI state. The page theme drives the page chrome (a `light` /
// `dark` class on <html>, see app.css) and every example grid. Both follow the
// TradeCanvas / TradingDek system: dark is the default, the choice persists.
const STORAGE_KEY = 'bo-grid-theme';

function load(): 'dark' | 'light' {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

class Ui {
  theme = $state<'dark' | 'light'>(typeof localStorage === 'undefined' ? 'dark' : load());

  /** The grid preset matching the page theme. */
  get grid(): GridTheme {
    return this.theme === 'dark' ? tradecanvasTheme : tradecanvasLightTheme;
  }
}

export const ui = new Ui();

export function toggleTheme(): void {
  ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEY, ui.theme);
  } catch {
    // storage blocked (private mode): the in-memory choice still applies
  }
}
