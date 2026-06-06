import { describe, it, expect } from 'vitest';
import { parseClipboard, isSingleCell } from './clipboard';

describe('parseClipboard', () => {
  it('parses a rectangular TSV block', () => {
    const grid = parseClipboard('a\tb\tc\n1\t2\t3');
    expect(grid).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('returns a single cell for a bare value', () => {
    const grid = parseClipboard('42');
    expect(grid).toEqual([['42']]);
    expect(isSingleCell(grid)).toBe(true);
  });

  it('treats empty input as no cells', () => {
    expect(parseClipboard('')).toEqual([]);
  });

  it('strips a single trailing newline (spreadsheet export)', () => {
    const grid = parseClipboard('a\tb\n1\t2\n');
    expect(grid).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('normalises CRLF and lone CR line endings', () => {
    expect(parseClipboard('a\r\nb')).toEqual([['a'], ['b']]);
    expect(parseClipboard('a\rb')).toEqual([['a'], ['b']]);
  });

  it('preserves empty trailing cells within a row', () => {
    expect(parseClipboard('a\t\tc')).toEqual([['a', '', 'c']]);
  });

  it('keeps a blank interior line as an empty-string row', () => {
    expect(parseClipboard('a\n\nb')).toEqual([['a'], [''], ['b']]);
  });

  it('isSingleCell is false for multi-row or multi-col grids', () => {
    expect(isSingleCell([['a'], ['b']])).toBe(false);
    expect(isSingleCell([['a', 'b']])).toBe(false);
    expect(isSingleCell([])).toBe(false);
  });
});
