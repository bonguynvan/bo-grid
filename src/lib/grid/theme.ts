/**
 * Theme = a partial set of design tokens. Applied as inline `--bo-grid-*` custom
 * properties on the grid root, so a theme overrides the built-in dark defaults
 * without any CSS import. Pass a built-in name or your own partial token map.
 */
export interface GridTheme {
  bg?: string;
  headerBg?: string;
  rowA?: string;
  rowB?: string;
  rowHover?: string;
  text?: string;
  textDim?: string;
  border?: string;
  up?: string;
  down?: string;
  amber?: string;
  selFill?: string;
  selBorder?: string;
  headerH?: string;
  mono?: string;
  sans?: string;
  /** Native-control color scheme: themes checkboxes, date pickers, number
      spinners, search-clear buttons and scrollbars. Defaults to dark. */
  scheme?: 'light' | 'dark';
}

const VARS: Record<keyof GridTheme, string> = {
  bg: '--bo-grid-bg',
  headerBg: '--bo-grid-header-bg',
  rowA: '--bo-grid-row-a',
  rowB: '--bo-grid-row-b',
  rowHover: '--bo-grid-row-hover',
  text: '--bo-grid-text',
  textDim: '--bo-grid-text-dim',
  border: '--bo-grid-border',
  up: '--bo-grid-up',
  down: '--bo-grid-down',
  amber: '--bo-grid-amber',
  selFill: '--bo-grid-sel-fill',
  selBorder: '--bo-grid-sel-border',
  headerH: '--bo-grid-header-h',
  mono: '--bo-grid-mono',
  sans: '--bo-grid-sans',
  scheme: '--bo-grid-scheme',
};

/** Serialize a theme to a CSS `--bo-grid-*: …;` declaration string. */
export function themeVars(theme: GridTheme): string {
  let out = '';
  for (const key of Object.keys(theme) as (keyof GridTheme)[]) {
    const value = theme[key];
    if (value != null) out += `${VARS[key]}:${value};`;
  }
  return out;
}

export const darkTheme: GridTheme = {
  bg: '#1a1a1a',
  headerBg: '#0f0f0f',
  rowA: '#131313',
  rowB: '#0f0f0f',
  rowHover: '#1f1f24',
  text: '#e5e5e5',
  textDim: '#8a8a8a',
  border: 'rgba(255,255,255,0.06)',
  up: '#34d399',
  down: '#f87171',
  amber: '#f59e0b',
  selFill: 'rgba(99,102,241,0.16)',
  selBorder: '#6366f1',
  scheme: 'dark',
};

// A deliberate light palette (not an inverted dark one): near-white surfaces,
// stronger green/red for contrast on light, subtle borders.
export const lightTheme: GridTheme = {
  bg: '#ffffff',
  headerBg: '#f6f7f9',
  rowA: '#fafbfc',
  rowB: '#ffffff',
  rowHover: '#eef1f6',
  text: '#16181d',
  textDim: '#6b7280',
  border: 'rgba(0,0,0,0.10)',
  up: '#16a34a',
  down: '#dc2626',
  amber: '#d97706',
  selFill: 'rgba(99,102,241,0.12)',
  selBorder: '#6366f1',
  scheme: 'light',
};
