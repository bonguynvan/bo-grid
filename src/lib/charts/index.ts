// Public API for the optional `bo-grid/charts` companion — tiny, dependency-free
// SVG charts for dashboards. Imported via the subpath so the grid core stays
// untouched: `import { LineChart } from 'bo-grid/charts';`
export { default as BarChart } from './BarChart.svelte';
export { default as LineChart } from './LineChart.svelte';
export { default as DonutChart } from './DonutChart.svelte';

export { CHART_PALETTE, CHART_COLOR } from './palette';

// Geometry helpers (for building your own SVG charts).
export { extent, linePoints, linePath, areaPath, barRects, donutArcs } from './chart-math';
export type { Point, Rect, Arc } from './chart-math';
