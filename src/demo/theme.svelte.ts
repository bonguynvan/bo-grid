// Shared demo UI state. The page theme drives both the page chrome (via a
// `light` / `dark` class on <html>, see app.css) and every example grid (each
// passes `theme={ui.theme}`). Light — the broadsheet palette — is the default.
export const ui = $state<{ theme: 'dark' | 'light' }>({ theme: 'light' });

export function toggleTheme(): void {
  ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
}
