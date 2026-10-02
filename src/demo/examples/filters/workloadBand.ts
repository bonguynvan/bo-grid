import type { CustomFilter, FilterTypeDef } from '../../../lib';
import WorkloadBand from './WorkloadBand.svelte';

export type Band = 'under' | 'balanced' | 'over';

export interface BandFilter extends CustomFilter {
  kind: 'band';
  bands: Band[];
}

export const BANDS: Array<{ id: Band; label: string }> = [
  { id: 'under', label: 'Under 40%' },
  { id: 'balanced', label: '40–80%' },
  { id: 'over', label: 'Over 80%' },
];

export const bandOf = (pct: number): Band => (pct < 40 ? 'under' : pct > 80 ? 'over' : 'balanced');

/** A registered filter kind: keep rows whose workload falls in a ticked band. */
export const bandFilter: FilterTypeDef<BandFilter> = {
  component: WorkloadBand,
  isActive: (f) => f.bands.length > 0,
  test: (value, f) => f.bands.includes(bandOf(Number(value))),
};
