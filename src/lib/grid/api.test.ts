import { describe, it, expect } from 'vitest';
import { scrollTopFor } from './api';

// viewport: scrollTop 100, height 200 → shows y in [100, 300)
const view = { top: 100, height: 200 };

describe('scrollTopFor', () => {
  it('nearest: leaves a fully visible row alone', () => {
    expect(scrollTopFor('nearest', 150, 36, view.top, view.height)).toBe(100);
  });

  it('nearest: scrolls up just enough for a row above', () => {
    expect(scrollTopFor('nearest', 40, 36, view.top, view.height)).toBe(40);
  });

  it('nearest: scrolls down just enough for a row below', () => {
    expect(scrollTopFor('nearest', 400, 36, view.top, view.height)).toBe(400 + 36 - 200);
  });

  it('start: puts the row at the top', () => {
    expect(scrollTopFor('start', 400, 36, view.top, view.height)).toBe(400);
  });

  it('end: puts the row at the bottom', () => {
    expect(scrollTopFor('end', 400, 36, view.top, view.height)).toBe(400 + 36 - 200);
  });

  it('center: centres the row', () => {
    expect(scrollTopFor('center', 400, 36, view.top, view.height)).toBe(400 + 18 - 100);
  });

  it('never returns a negative scrollTop', () => {
    expect(scrollTopFor('center', 0, 36, 0, 200)).toBe(0);
    expect(scrollTopFor('end', 0, 36, 0, 200)).toBe(0);
  });
});
