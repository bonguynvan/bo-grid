import { describe, it, expect } from 'vitest';
import type { ColumnDef } from './column';
import { isEditable } from './column';
import { parseCellInput } from './edit';

const row = { id: 1, a: 'x' };

describe('parseCellInput', () => {
  it('keeps text as typed', () => {
    expect(parseCellInput({ type: 'text', key: 'a', header: 'A' }, 'hello', row)).toEqual({ ok: true, value: 'hello' });
  });

  it('coerces numeric columns and rejects non-numbers', () => {
    const col: ColumnDef = { type: 'number', key: 'n', header: 'N' };
    expect(parseCellInput(col, '42.5', row)).toEqual({ ok: true, value: 42.5 });
    expect(parseCellInput(col, 'abc', row)).toEqual({ ok: false });
  });

  it('turns a date input into local midnight', () => {
    const col: ColumnDef = { type: 'date', key: 'd', header: 'D' };
    expect(parseCellInput(col, '2024-01-15', row)).toEqual({ ok: true, value: new Date(2024, 0, 15).getTime() });
    expect(parseCellInput(col, 'nope', row)).toEqual({ ok: false });
  });

  it('lets a column parser decide, ahead of the built-in coercion', () => {
    const col: ColumnDef = {
      type: 'number',
      key: 'n',
      header: 'N',
      parse: (raw) => Number(raw.replace(/[$,]/g, '')),
    };
    expect(parseCellInput(col, '$1,250', row)).toEqual({ ok: true, value: 1250 });
  });

  it('treats undefined or a non-finite number from a parser as a rejection', () => {
    const undef: ColumnDef = { type: 'text', key: 'a', header: 'A', parse: () => undefined };
    const nan: ColumnDef = { type: 'text', key: 'a', header: 'A', parse: () => NaN };
    expect(parseCellInput(undef, 'x', row)).toEqual({ ok: false });
    expect(parseCellInput(nan, 'x', row)).toEqual({ ok: false });
  });

  it('passes the row to the parser', () => {
    const col: ColumnDef = { type: 'text', key: 'a', header: 'A', parse: (raw, r) => `${r.id}:${raw}` };
    expect(parseCellInput(col, 'v', row)).toEqual({ ok: true, value: '1:v' });
  });
});

describe('isEditable with a custom editor', () => {
  it('makes a display-only type editable when it has an editor', () => {
    const Fake = (() => null) as unknown as NonNullable<ColumnDef['editor']>;
    expect(isEditable({ type: 'rating', key: 'r', header: 'R', editable: true })).toBe(false);
    expect(isEditable({ type: 'rating', key: 'r', header: 'R', editable: true, editor: Fake })).toBe(true);
    expect(isEditable({ type: 'rating', key: 'r', header: 'R', editor: Fake })).toBe(false);
  });
});
