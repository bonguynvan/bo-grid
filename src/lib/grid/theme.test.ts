import { describe, it, expect } from 'vitest';
import { themeVars, lightTheme, darkTheme, themePresets } from './theme';

describe('themeVars', () => {
  it('maps theme keys to --bo-grid-* custom properties', () => {
    expect(themeVars({ bg: '#fff', up: '#0f0' })).toBe('--bo-grid-bg:#fff;--bo-grid-up:#0f0;');
  });

  it('skips undefined values', () => {
    expect(themeVars({ bg: '#fff', text: undefined })).toBe('--bo-grid-bg:#fff;');
  });

  it('serializes the light preset to valid declarations', () => {
    const css = themeVars(lightTheme);
    expect(css).toContain('--bo-grid-bg:#ffffff;');
    expect(css).toContain('--bo-grid-text:#16181d;');
    expect(css.endsWith(';')).toBe(true);
  });

  it('dark and light presets define the same token set', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('every built-in preset defines the same token set and serializes', () => {
    const keys = Object.keys(darkTheme).sort();
    for (const [name, preset] of Object.entries(themePresets)) {
      expect(Object.keys(preset).sort(), `preset ${name}`).toEqual(keys);
      expect(themeVars(preset).endsWith(';'), `preset ${name}`).toBe(true);
    }
  });

  it('exposes the expected preset names', () => {
    expect(Object.keys(themePresets)).toEqual([
      'dark',
      'light',
      'high-contrast-dark',
      'high-contrast-light',
      'midnight',
      'terminal',
      'tradecanvas',
      'tradecanvas-light',
    ]);
  });

  it('the TradeCanvas presets keep every text colour at WCAG AA (4.5:1) on every row surface', () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const contrast = (a: string, b: string) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    for (const name of ['tradecanvas', 'tradecanvas-light'] as const) {
      const t = themePresets[name];
      for (const fg of ['text', 'textDim', 'up', 'down', 'amber'] as const) {
        for (const bg of ['bg', 'headerBg', 'rowA', 'rowB', 'rowHover'] as const) {
          expect(contrast(t[fg]!, t[bg]!), `${name}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it('serializes layout/density tokens (radius / fontSize / cellPad)', () => {
    expect(themeVars({ radius: '14px', fontSize: '12px', cellPad: '12px' })).toBe(
      '--bo-grid-radius:14px;--bo-grid-font-size:12px;--bo-grid-cell-pad:12px;',
    );
  });
});
