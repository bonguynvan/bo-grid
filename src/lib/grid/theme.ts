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
  /** Outer corner radius (e.g. '8px', '0', '14px'). Default 8px. */
  radius?: string;
  /** Cell/row font size (e.g. '13px', '12px'). Default 13px. */
  fontSize?: string;
  /** Horizontal cell padding — the main density lever (e.g. '8px', '12px').
      Pair with `rowHeight` for a fully compact or roomy look. Default 8px. */
  cellPad?: string;
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
  radius: '--bo-grid-radius',
  fontSize: '--bo-grid-font-size',
  cellPad: '--bo-grid-cell-pad',
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

// High-contrast dark (accessibility): pure black, white text, strong borders and
// vivid status colours — comfortably exceeds WCAG AA, toward AAA.
export const highContrastDark: GridTheme = {
  bg: '#000000',
  headerBg: '#0a0a0a',
  rowA: '#000000',
  rowB: '#0a0a0a',
  rowHover: '#1c1c1c',
  text: '#ffffff',
  textDim: '#c8c8c8',
  border: 'rgba(255,255,255,0.34)',
  up: '#00e676',
  down: '#ff5252',
  amber: '#ffd740',
  selFill: 'rgba(255,255,255,0.20)',
  selBorder: '#ffffff',
  scheme: 'dark',
};

// High-contrast light (accessibility): white, near-black text, strong borders.
export const highContrastLight: GridTheme = {
  bg: '#ffffff',
  headerBg: '#eeeeee',
  rowA: '#ffffff',
  rowB: '#f5f5f5',
  rowHover: '#e3e3e3',
  text: '#000000',
  textDim: '#383838',
  border: 'rgba(0,0,0,0.42)',
  up: '#007a36',
  down: '#c20000',
  amber: '#7a5c00',
  selFill: 'rgba(0,0,0,0.10)',
  selBorder: '#000000',
  scheme: 'light',
};

// Midnight: a deep navy/indigo dark theme — a calmer, "premium" alternative.
export const midnightTheme: GridTheme = {
  bg: '#0f172a',
  headerBg: '#0b1120',
  rowA: '#0f172a',
  rowB: '#121d35',
  rowHover: '#1e293b',
  text: '#e2e8f0',
  textDim: '#94a3b8',
  border: 'rgba(148,163,184,0.16)',
  up: '#34d399',
  down: '#fb7185',
  amber: '#fbbf24',
  selFill: 'rgba(129,140,248,0.22)',
  selBorder: '#818cf8',
  scheme: 'dark',
};

// Terminal: green phosphor on near-black — a retro fintech/console look.
export const terminalTheme: GridTheme = {
  bg: '#0a0f0a',
  headerBg: '#0d140d',
  rowA: '#0a0f0a',
  rowB: '#0e160e',
  rowHover: '#16241a',
  text: '#4ade80',
  textDim: '#3f9e60',
  border: 'rgba(74,222,128,0.20)',
  up: '#4ade80',
  down: '#f87171',
  amber: '#fde047',
  selFill: 'rgba(74,222,128,0.16)',
  selBorder: '#4ade80',
  scheme: 'dark',
};

/** All built-in presets, keyed by name (handy for a theme picker). */
export const themePresets = {
  dark: darkTheme,
  light: lightTheme,
  'high-contrast-dark': highContrastDark,
  'high-contrast-light': highContrastLight,
  midnight: midnightTheme,
  terminal: terminalTheme,
} satisfies Record<string, GridTheme>;

/** Built-in preset name. */
export type ThemePreset = keyof typeof themePresets;
