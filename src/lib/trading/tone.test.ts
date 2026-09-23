import { describe, it, expect } from 'vitest';
import { resolveTone, toneColor, defaultToneColors } from './tone';

describe('resolveTone', () => {
  const bands = { ref: 100, ceiling: 107, floor: 93 };

  it('is "ceiling" at the ceiling price', () => {
    expect(resolveTone(107, bands)).toBe('ceiling');
  });

  it('is "floor" at the floor price', () => {
    expect(resolveTone(93, bands)).toBe('floor');
  });

  it('is "ref" exactly at the reference price', () => {
    expect(resolveTone(100, bands)).toBe('ref');
  });

  it('is "up" above reference but below ceiling', () => {
    expect(resolveTone(103, bands)).toBe('up');
  });

  it('is "down" below reference but above floor', () => {
    expect(resolveTone(97, bands)).toBe('down');
  });

  it('tolerates float noise at the ceiling/floor/ref boundaries', () => {
    expect(resolveTone(106.999999, bands)).toBe('ceiling');
    expect(resolveTone(93.000001, bands)).toBe('floor');
    expect(resolveTone(99.999999, bands)).toBe('ref');
  });

  it('does not misclassify a value just inside the band as ceiling/floor', () => {
    expect(resolveTone(106.5, bands)).toBe('up');
    expect(resolveTone(93.5, bands)).toBe('down');
  });

  it('falls back to up/down when ceiling/floor are not given', () => {
    expect(resolveTone(105, { ref: 100 })).toBe('up');
    expect(resolveTone(95, { ref: 100 })).toBe('down');
    expect(resolveTone(100, { ref: 100 })).toBe('ref');
  });

  it('honours a custom epsilon', () => {
    // Without a wide epsilon, 100.5 is "up", not "ref".
    expect(resolveTone(100.5, bands)).toBe('up');
    expect(resolveTone(100.5, bands, { epsilon: 1 })).toBe('ref');
  });
});

describe('toneColor', () => {
  it('returns a distinct colour for each tone', () => {
    const tones = ['ceiling', 'floor', 'ref', 'up', 'down'] as const;
    const colors = tones.map((t) => toneColor(t));
    expect(new Set(colors).size).toBe(tones.length);
  });

  it('honours a partial colour override without needing the full map', () => {
    expect(toneColor('ceiling', { ceiling: '#fff' })).toBe('#fff');
    expect(toneColor('up', { ceiling: '#fff' })).toBe(defaultToneColors.up);
  });
});
