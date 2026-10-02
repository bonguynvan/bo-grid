// Built-in formatters (proposal Phase 1 §Ticker column + formatting).

export function fmtPrice(v: number, locale = 'en-US'): string {
  return v.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

export function fmtDate(ms: number, style: DateStyle = 'medium', locale = 'en-US'): string {
  if (!Number.isFinite(ms)) return '';
  const opts: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { month: 'numeric', day: 'numeric', year: '2-digit' }
      : { month: 'short', day: 'numeric', year: 'numeric' };
  return new Date(ms).toLocaleDateString(locale, opts);
}

/** Localized currency (e.g. `$1,234.50`). Falls back to a fixed-decimal number
    if the ISO `currency` code is unsupported. */
export function fmtCurrency(v: number, currency = 'USD', locale = 'en-US', decimals?: number): string {
  if (!Number.isFinite(v)) return '';
  const fd = decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : {};
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, ...fd }).format(v);
  } catch {
    return v.toFixed(decimals ?? 2);
  }
}

// Coarse relative-time thresholds (seconds → unit divisor + label).
const RT: [number, number, string][] = [
  [3600, 60, 'min'],
  [86_400, 3600, 'hour'],
  [604_800, 86_400, 'day'],
  [2_629_800, 604_800, 'week'],
  [31_557_600, 2_629_800, 'month'],
  [Infinity, 31_557_600, 'year'],
];

const RT_UNITS: [number, number, Intl.RelativeTimeFormatUnit][] = [
  [60, 1, 'second'],
  [3600, 60, 'minute'],
  [86_400, 3600, 'hour'],
  [604_800, 86_400, 'day'],
  [2_629_800, 604_800, 'week'],
  [31_557_600, 2_629_800, 'month'],
  [Infinity, 31_557_600, 'year'],
];

function intlRelative(secsAgo: number, locale: string): string {
  const a = Math.abs(secsAgo);
  const sign = secsAgo >= 0 ? -1 : 1;
  const fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [ceil, div, unit] of RT_UNITS) {
    if (a < ceil) return fmt.format(sign * Math.floor(a / div), unit);
  }
  return '';
}

/** Human relative time vs `now` (default: real now) — e.g. `3 hours ago`,
    `in 2 days`. `ms` is an epoch timestamp. Deterministic when `now` is passed. With a `locale`, output comes from
    `Intl.RelativeTimeFormat`. */
export function relativeTime(ms: number, now = Date.now(), locale?: string): string {
  if (!Number.isFinite(ms)) return '';
  const secs = Math.round((now - ms) / 1000); // >0 = past
  if (locale) return intlRelative(secs, locale);
  const past = secs >= 0;
  const a = Math.abs(secs);
  if (a < 45) return past ? 'just now' : 'soon';
  for (const [ceil, div, unit] of RT) {
    if (a < ceil) {
      const n = Math.floor(a / div);
      const label = `${n} ${unit}${n === 1 ? '' : 's'}`;
      return past ? `${label} ago` : `in ${label}`;
    }
  }
  return '';
}
