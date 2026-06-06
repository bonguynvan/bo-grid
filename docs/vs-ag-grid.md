# bo-grid vs AG Grid

An honest comparison to help you choose. Short version: **bo-grid gives you most
of AG Grid's *paid* (Enterprise) feature set for free, in a fraction of the
bundle, natively in Svelte 5 — but it is young and intentionally does not chase
full parity.** If you live in React/Angular, need integrated charting, or need
the deepest enterprise filtering, AG Grid is the safer pick. If you're on Svelte
and want fintech-grade tables that stay small and fast, bo-grid is built for you.

## Feature parity

AG Grid splits features across **Community** (free, MIT) and **Enterprise**
(commercial, per-developer license). The interesting column is the middle one —
features AG Grid puts behind the Enterprise paywall that bo-grid ships for free.

| Feature | AG Grid | bo-grid |
| --- | --- | --- |
| Virtual scrolling | Community | ✅ |
| Sort / filter / pagination | Community | ✅ |
| Column resize / reorder / pin / hide | Community | ✅ |
| Cell editing | Community | ✅ (+ type-to-edit, validation, select) |
| Row selection | Community | ✅ |
| CSV export | Community | ✅ |
| Custom cell renderers | Community | ✅ (Svelte snippets) |
| **Row grouping + aggregation** | **Enterprise 💰** | ✅ free |
| **Pivot tables** | **Enterprise 💰** | ✅ free |
| **Tree data** | **Enterprise 💰** | ✅ free |
| **Master / detail** | **Enterprise 💰** | ✅ free |
| **Range selection + clipboard copy/paste** | **Enterprise 💰** | ✅ free |
| **Excel export** | **Enterprise 💰** | ✅ free (optional `xlsx`) |
| **Sparklines** | **Enterprise 💰** | ✅ free (the headline) |
| **Status bar / totals** | **Enterprise 💰** | ✅ free (footer) |
| **Context menu** | **Enterprise 💰** | ✅ free (`rowMenu`) |
| Realtime cell flashing | Enterprise 💰 | ✅ free |

## What bo-grid does *not* have (yet, or by design)

Being honest matters more than a longer table:

- **Integrated charting** — AG Grid can turn a selection into a full chart.
  bo-grid has **sparklines** instead; full charts are deliberately out of scope
  (they'd blow the "tiny" budget). Pair bo-grid with a chart library if needed.
- **Set / advanced filter UI** — AG Grid has Excel-style filter menus per column.
  bo-grid has a controlled `filter` predicate + a per-column `filterRow`, not a
  built-in filter popup. (On the roadmap.)
- **Columns / filters tool panel (sidebar)** — bo-grid exposes `hiddenColumns` so
  you can build your own picker, but ships no sidebar UI.
- **Full server-side row model** — bo-grid's `RowSource` windows flat data larger
  than memory; it does not lazy-load *grouped/tree* levels the way AG's SSRM does.
- **Fill handle, undo/redo, viewport row model** — not implemented.
- **React / Angular / Vue** — bo-grid is Svelte 5 only. AG Grid is framework-agnostic.

## Bundle & cost

| | AG Grid | bo-grid |
| --- | --- | --- |
| License | Community MIT; Enterprise commercial (per dev/yr) | MIT, all features free |
| Core bundle | hundreds of KB | **~20 KB gzip** |
| Framework | wrapper per framework | native Svelte 5 |

See [BENCHMARKS.md](../BENCHMARKS.md) for measured size and hot-path numbers.

## Choose…

**Choose bo-grid if:** you're on Svelte/SvelteKit; you want grouping, pivot,
tree, master-detail, sparklines, or realtime **without an Enterprise license**;
bundle size and SSR matter; your domain is fintech/data-dense tables.

**Choose AG Grid if:** you're on React/Angular/Vue; you need integrated charts,
Excel-grade set filters, or lazy server-side grouping today; you want a mature
product with commercial support and don't mind the size/cost.

> bo-grid is young. It's comprehensive for its size, but AG Grid is a
> decade-deep product. This comparison is written to be accurate, not flattering —
> if you spot something wrong or out of date, please open an issue.
```
