// Shared demo UI state. The page theme drives both the page chrome (via a
// `light` class on <html>, see app.css) and every example grid (each passes
// `theme={ui.theme}`). Svelte 5 cross-module reactive state.
export const ui = $state<{ theme: 'dark' | 'light' }>({ theme: 'dark' });

export function toggleTheme(): void {
  ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
}
