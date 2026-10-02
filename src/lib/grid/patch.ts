// In-place row patching for the realtime fast path. Writing into plain row
// objects costs a fraction of writing through reactive proxies; the grid then
// repaints only the rendered rows whose keys this returns.

/** Write each patch onto the row with that key; return the keys whose row
    actually changed. Undefined fields are skipped; equality is `Object.is`. */
export function patchRowsInPlace<K, R extends object>(
  index: ReadonlyMap<K, R>,
  patches: Iterable<readonly [K, Partial<R>]>,
): Set<K> {
  const changed = new Set<K>();
  for (const [key, patch] of patches) {
    const row = index.get(key) as Record<string, unknown> | undefined;
    if (!row) continue;
    for (const field in patch) {
      const next = (patch as Record<string, unknown>)[field];
      if (next === undefined || Object.is(row[field], next)) continue;
      row[field] = next;
      changed.add(key);
    }
  }
  return changed;
}
