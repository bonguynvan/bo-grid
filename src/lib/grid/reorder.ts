/** Return a new array with the item at index `from` moved to index `to`. */
export function moveIndex<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = [...arr];
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length || from === to) {
    return next;
  }
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
