// Calendar days in the viewer's time zone. A `date` cell displays its epoch-ms
// value as a local day, so the editor, the filter and the display must all agree
// on that same day — never on the UTC day, which differs east and west of UTC.

/** Local midnight of the day containing `ms`. */
export function dayStart(ms: number): number {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** `yyyy-mm-dd` of the local day containing `ms` (a date input's value); '' if invalid. */
export function toDateInput(ms: number): string {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local midnight of a `yyyy-mm-dd` string; NaN for anything that is not a real day. */
export function fromDateInput(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return NaN;
  const [y, mo, d] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const date = new Date(y, mo, d);
  return date.getFullYear() === y && date.getMonth() === mo && date.getDate() === d ? date.getTime() : NaN;
}
