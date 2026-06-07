import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { toCSV, rowsToMatrix, parseCSV, parseCSVMatrix, parseTSV, parseJSON, parseRows, rowsFromObjects } from './export';

const columns: ColumnDef[] = [
  { type: 'text', key: 'name', header: 'Name' },
  { type: 'price', key: 'price', header: 'Price' },
  { type: 'sparkline', key: 'candles', sparkKey: 'candles', header: 'Trend' },
];

const rows = [
  { id: 0, name: 'Acme, Inc', price: 12.5, candles: [] },
  { id: 1, name: 'Quote "Co"', price: 7, candles: [] },
] as unknown as GridRow[];

describe('rowsToMatrix', () => {
  it('excludes sparkline columns and includes a header row', () => {
    const m = rowsToMatrix(rows, columns);
    expect(m[0]).toEqual(['Name', 'Price']);
    expect(m).toHaveLength(3);
  });

  it('keeps numeric columns as raw numbers', () => {
    expect(rowsToMatrix(rows, columns)[1][1]).toBe(12.5);
  });

  it('omits the header when header:false', () => {
    expect(rowsToMatrix(rows, columns, { header: false })).toHaveLength(2);
  });

  it('exports a computed column via value() (no backing field)', () => {
    const cols: ColumnDef[] = [
      { type: 'price', key: 'price', header: 'Price' },
      { type: 'number', key: 'doubled', header: 'Doubled', value: (r) => (r.price as number) * 2 },
    ];
    const m = rowsToMatrix(rows, cols, { header: false });
    expect(m[0]).toEqual([12.5, 25]); // 12.5 → 25
    expect(m[1]).toEqual([7, 14]);
  });
});

describe('toCSV', () => {
  it('quotes fields with commas and doubles embedded quotes', () => {
    const lines = toCSV(rows, columns).split('\r\n');
    expect(lines[0]).toBe('Name,Price');
    expect(lines[1]).toBe('"Acme, Inc",12.5');
    expect(lines[2]).toBe('"Quote ""Co""",7');
  });

  it('runs values through formatters in formatted mode', () => {
    const csv = toCSV(rows, columns, { formatted: true, header: false });
    expect(csv.startsWith('"Acme, Inc",12.50')).toBe(true);
  });
});

describe('parseCSVMatrix', () => {
  it('parses simple rows (LF and CRLF)', () => {
    expect(parseCSVMatrix('a,b\n1,2')).toEqual([['a', 'b'], ['1', '2']]);
    expect(parseCSVMatrix('a,b\r\n1,2\r\n')).toEqual([['a', 'b'], ['1', '2']]);
  });
  it('handles quoted fields with commas, doubled quotes and newlines', () => {
    expect(parseCSVMatrix('"Acme, Inc","say ""hi"""')).toEqual([['Acme, Inc', 'say "hi"']]);
    expect(parseCSVMatrix('"line1\nline2",x')).toEqual([['line1\nline2', 'x']]);
  });
  it('keeps empty fields', () => {
    expect(parseCSVMatrix('a,,c')).toEqual([['a', '', 'c']]);
  });
});

describe('parseCSV', () => {
  const cols: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name' },
    { type: 'number', key: 'qty', header: 'Qty' },
    { type: 'date', key: 'start', header: 'Start' },
  ];

  it('maps headers to keys, coercing numeric + date columns', () => {
    const out = parseCSV('Name,Qty,Start\nAcme,5,2020-03-01\n', cols);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Acme');
    expect(out[0].qty).toBe(5); // numeric coercion
    expect(out[0].start).toBe(Date.parse('2020-03-01')); // date → epoch ms
    expect(out[0].id).toBe(0); // GridRow-ready
    expect(out[0].flashSeq).toBe(0);
  });

  it('leaves blanks and unparseable values as-is, drops blank lines', () => {
    const out = parseCSV('Name,Qty\nAcme,\n\nBeta,x\n', cols);
    expect(out).toHaveLength(2); // blank line dropped
    expect(out[0].qty).toBe(''); // blank stays blank (not 0)
    expect(out[1].qty).toBe('x'); // unparseable numeric stays string
  });

  it('round-trips with toCSV (raw mode)', () => {
    const original = [
      { id: 0, flashSeq: 0, flashDir: 'up', name: 'Acme, Inc', qty: 5, start: Date.UTC(2020, 2, 1) },
    ] as unknown as GridRow[];
    const csv = toCSV(original, cols); // date exports formatted; re-parse to ms
    const back = parseCSV(csv, cols);
    expect(back[0].name).toBe('Acme, Inc'); // quoted comma survives the round-trip
    expect(back[0].qty).toBe(5);
  });
});

describe('parseTSV', () => {
  const cols: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name' },
    { type: 'number', key: 'qty', header: 'Qty' },
  ];
  it('parses tab-separated rows (same mapping as CSV)', () => {
    const out = parseTSV('Name\tQty\nAcme\t5\nBeta\t9', cols);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ name: 'Acme', qty: 5 });
    expect(out[1]).toMatchObject({ name: 'Beta', qty: 9 });
  });
  it('does not split on commas (only tabs)', () => {
    const out = parseTSV('Name\tQty\nAcme, Inc\t5', cols);
    expect(out[0].name).toBe('Acme, Inc'); // comma stays in the field
  });
});

describe('rowsFromObjects', () => {
  it('stamps id (index) + flash fields, keeping all fields', () => {
    const out = rowsFromObjects([{ name: 'A', n: 1 }, { name: 'B', n: 2 }]);
    expect(out[0]).toEqual({ id: 0, flashSeq: 0, flashDir: 'up', name: 'A', n: 1 });
    expect(out[1].id).toBe(1);
  });
  it("keeps an object's own id", () => {
    expect(rowsFromObjects([{ id: 'x7', name: 'A' }])[0].id).toBe('x7');
  });
});

describe('parseJSON', () => {
  it('parses a JSON array of objects into rows', () => {
    const out = parseJSON('[{"name":"A","n":1},{"name":"B","n":2}]');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: 0, name: 'A', n: 1 });
  });
  it('throws on a non-array top level', () => {
    expect(() => parseJSON('{"name":"A"}')).toThrow();
  });
});

describe('parseRows (auto-detect)', () => {
  const cols: ColumnDef[] = [
    { type: 'text', key: 'name', header: 'Name' },
    { type: 'number', key: 'n', header: 'N' },
  ];
  it('detects a JSON array', () => {
    const out = parseRows('  [{"name":"A","n":1}]', cols);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ name: 'A', n: 1 });
  });
  it('detects TSV (tab in the first line)', () => {
    const out = parseRows('Name\tN\nA\t5', cols);
    expect(out[0]).toMatchObject({ name: 'A', n: 5 });
  });
  it('falls back to CSV otherwise', () => {
    const out = parseRows('Name,N\nA,5', cols);
    expect(out[0]).toMatchObject({ name: 'A', n: 5 });
  });
  it('falls through to delimited when leading "[" is not valid JSON (no throw)', () => {
    // Starts with "[" but is really CSV — parseJSON fails, so it parses as CSV.
    const out = parseRows('[bracketed],N\n[x],5', cols);
    expect(out).toHaveLength(1);
    expect(out[0]['[bracketed]']).toBe('[x]'); // unmatched header → raw key; parsed as CSV
  });
});
