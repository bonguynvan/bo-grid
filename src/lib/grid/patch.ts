// In-place row patching for the realtime fast path. Writing into plain row
// objects costs a fraction of writing through reactive proxies; the grid then
// repaints only the rendered cells whose fields this reports.

/** Write each patch onto the row with that key; return, per row key, the
    fields that actually changed. Undefined fields are skipped; equality is
    `Object.is`. */
export function patchRowsInPlace<K, R extends object>(
  index: ReadonlyMap<K, R>,
  patches: Iterable<readonly [K, Partial<R>]>,
): Map<K, Set<string>> {
  const changed = new Map<K, Set<string>>();
  for (const [key, patch] of patches) {
    const row = index.get(key) as Record<string, unknown> | undefined;
    if (!row) continue;
    for (const field in patch) {
      const next = (patch as Record<string, unknown>)[field];
      if (next === undefined || Object.is(row[field], next)) continue;
      row[field] = next;
      let fields = changed.get(key);
      if (!fields) changed.set(key, (fields = new Set()));
      fields.add(field);
    }
  }
  return changed;
}
