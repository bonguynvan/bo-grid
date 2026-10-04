// Row-number column (`rowNumbers`).

/** Width of the row-number column for `count` rows: the widest number plus
    padding, never narrower than a two-digit column. */
export function rowNumberWidth(count: number): number {
  const digits = String(Math.max(1, Math.floor(count))).length;
  return Math.max(36, 16 + digits * 8);
}

/** Each visual row's number: data rows count 1, 2, 3… in view order; group
    headers and loading rows get 0 (no number). */
export function dataOrdinals(flat: readonly { kind: string }[]): Int32Array {
  const out = new Int32Array(flat.length);
  let n = 0;
  for (let i = 0; i < flat.length; i++) if (flat[i].kind === 'data') out[i] = ++n;
  return out;
}
