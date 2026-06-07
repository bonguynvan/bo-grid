import { describe, it, expect } from 'vitest';
import type { GridRow } from './column';
import { buildFlatRows, activeGroupsAt, buildLazyGroupRows, type LazyGroup } from './grouping';

const rows = [
  { id: 0, sector: 'Tech', exchange: 'NYSE' },
  { id: 1, sector: 'Tech', exchange: 'NASDAQ' },
  { id: 2, sector: 'Energy', exchange: 'NYSE' },
] as unknown as GridRow[];

describe('buildFlatRows', () => {
  it('returns plain data rows when no grouping', () => {
    const flat = buildFlatRows(rows, [], new Set());
    expect(flat).toHaveLength(3);
    expect(flat.every((r) => r.kind === 'data')).toBe(true);
  });

  it('emits a group header before each group, sorted by key', () => {
    const flat = buildFlatRows(rows, ['sector'], new Set());
    // Energy(header)+1 data, Tech(header)+2 data = 2 headers + 3 data
    expect(flat).toHaveLength(5);
    expect(flat[0]).toMatchObject({ kind: 'group' });
    expect(flat[0].kind === 'group' && flat[0].group.value).toBe('Energy');
    expect(flat[0].kind === 'group' && flat[0].group.count).toBe(1);
  });

  it('omits children of collapsed groups', () => {
    const flat = buildFlatRows(rows, ['sector'], new Set(['Tech']));
    // Energy header + 1 data + Tech header (collapsed) = 3
    expect(flat).toHaveLength(3);
  });

  it('nests groups by multiple keys', () => {
    const flat = buildFlatRows(rows, ['sector', 'exchange'], new Set());
    const groups = flat.filter((r) => r.kind === 'group');
    // Energy, Energy/NYSE, Tech, Tech/NASDAQ, Tech/NYSE
    expect(groups).toHaveLength(5);
    const tech = flat.find((r) => r.kind === 'group' && r.group.path === 'Tech');
    expect(tech?.kind === 'group' && tech.group.depth).toBe(0);
  });
});

describe('activeGroupsAt', () => {
  it('returns the group chain for a row index', () => {
    const flat = buildFlatRows(rows, ['sector', 'exchange'], new Set());
    // Find a Tech/NASDAQ data row index
    const idx = flat.findIndex((r) => r.kind === 'data' && r.row.id === 1);
    const chain = activeGroupsAt(flat, idx).map((g) => g.path);
    expect(chain).toEqual(['Tech', 'Tech/NASDAQ']);
  });
});

describe('buildLazyGroupRows', () => {
  const groups: LazyGroup[] = [
    { key: 'Tech', count: 12, agg: { mv: '$1.2B' } },
    { key: 'Energy', label: 'Energy & Utilities', count: 5 },
  ];

  it('shows one collapsed header per group when nothing is expanded', () => {
    const flat = buildLazyGroupRows(groups, {
      isExpanded: () => false,
      rowsOf: () => undefined,
      isLoading: () => false,
    });
    expect(flat.map((r) => r.kind)).toEqual(['group', 'group']);
    expect(flat.every((r) => r.kind === 'group' && r.group.collapsed)).toBe(true);
    // Server-provided count, label and aggregates carry onto the header.
    const tech = flat[0] as { group: { count: number; aggText?: Record<string, string> } };
    expect(tech.group.count).toBe(12);
    expect(tech.group.aggText?.mv).toBe('$1.2B');
    expect((flat[1] as { group: { value: string } }).group.value).toBe('Energy & Utilities');
  });

  it('shows a loading placeholder under an expanded, still-loading group', () => {
    const flat = buildLazyGroupRows(groups, {
      isExpanded: (k) => k === 'Tech',
      rowsOf: () => undefined,
      isLoading: (k) => k === 'Tech',
    });
    expect(flat.map((r) => r.kind)).toEqual(['group', 'treeloading', 'group']);
  });

  it('renders loaded rows under an expanded group', () => {
    const loaded = [{ id: 1 }, { id: 2 }] as unknown as GridRow[];
    const flat = buildLazyGroupRows(groups, {
      isExpanded: (k) => k === 'Tech',
      rowsOf: (k) => (k === 'Tech' ? loaded : undefined),
      isLoading: () => false,
    });
    expect(flat.map((r) => r.kind)).toEqual(['group', 'data', 'data', 'group']);
  });
});
