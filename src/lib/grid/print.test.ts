import { describe, it, expect } from 'vitest';
import type { ColumnDef, GridRow } from './column';
import { toHTMLTable, escapeHTML } from './print';

const columns: ColumnDef[] = [
  { type: 'text', key: 'name', header: 'Name' },
  { type: 'price', key: 'price', header: 'Price' },
  { type: 'sparkline', key: 'c', sparkKey: 'c', header: 'Trend' },
  { type: 'custom', key: 'x', header: 'Action' },
];

const rows = [
  { id: 0, flashSeq: 0, flashDir: 'up', name: 'Acme', price: 12.5, c: [] },
  { id: 1, flashSeq: 0, flashDir: 'up', name: '<b>Beta</b>', price: 7, c: [] },
] as unknown as GridRow[];

describe('escapeHTML', () => {
  it('escapes the HTML-significant characters', () => {
    expect(escapeHTML('a<b>&"\'')).toBe('a&lt;b&gt;&amp;&quot;&#39;');
  });
});

describe('toHTMLTable', () => {
  const html = toHTMLTable(rows, columns);

  it('emits a thead with the (non-skipped) headers', () => {
    expect(html).toContain('<thead><tr><th>Name</th>');
    expect(html).toContain('Price');
  });

  it('skips sparkline and custom columns', () => {
    expect(html).not.toContain('Trend');
    expect(html).not.toContain('Action');
  });

  it('renders one tbody row per data row, formatted', () => {
    const bodyRows = html.match(/<tbody>(.*)<\/tbody>/s)?.[1].match(/<tr>/g) ?? [];
    expect(bodyRows).toHaveLength(2);
    expect(html).toContain('12.50'); // price formatter applied
  });

  it('right-aligns numeric columns', () => {
    expect(html).toContain('<th style="text-align:right">Price</th>');
    expect(html).toContain('<td style="text-align:right">12.50</td>');
  });

  it('escapes cell values', () => {
    expect(html).toContain('&lt;b&gt;Beta&lt;/b&gt;');
    expect(html).not.toContain('<b>Beta</b>');
  });
});
