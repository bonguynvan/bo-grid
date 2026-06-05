// Built-in formatters (proposal Phase 1 §Ticker column + formatting).

export function fmtPrice(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function fmtPercent(v: number): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}%`;
}

export function fmtVolume(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return `${v}`;
}

export type DateStyle = 'short' | 'medium';

export function fmtDate(ms: number, style: DateStyle = 'medium'): string {
  if (!Number.isFinite(ms)) return '';
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'numeric', day: 'numeric', year: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(ms).toLocaleDateString('en-US', opts);
}
