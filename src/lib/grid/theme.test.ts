import { describe, it, expect } from 'vitest';
import { themeVars, lightTheme, darkTheme } from './theme';

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

  it('serializes layout/density tokens (radius / fontSize / cellPad)', () => {
    expect(themeVars({ radius: '14px', fontSize: '12px', cellPad: '12px' })).toBe(
      '--bo-grid-radius:14px;--bo-grid-font-size:12px;--bo-grid-cell-pad:12px;',
    );
  });
});
