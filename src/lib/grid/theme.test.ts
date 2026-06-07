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
    ]);
  });

  it('serializes layout/density tokens (radius / fontSize / cellPad)', () => {
    expect(themeVars({ radius: '14px', fontSize: '12px', cellPad: '12px' })).toBe(
      '--bo-grid-radius:14px;--bo-grid-font-size:12px;--bo-grid-cell-pad:12px;',
    );
  });
});
