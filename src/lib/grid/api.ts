import type { GridRow } from './column';
import type { GridState } from './state';

export type ScrollAlign = 'start' | 'center' | 'end' | 'nearest';

/** The handle `onReady` hands out: things that are actions, not state. */
export interface GridApi {
  /** Scroll a row into view by its id. Returns false when the row is not in the
      current view (filtered out, not loaded, or unknown). */
  scrollToRow(key: string | number, align?: ScrollAlign): boolean;
  /** Focus (and select) one cell by row id and column key. Returns false when
      the row or column is not currently visible. */
  focusCell(rowKey: string | number, columnKey: string): boolean;
  /** Ticked rows (needs `rowSelection`), in view order. */
  getSelectedRows(): GridRow[];
  /** Fit columns to their content, as the column menu's Autosize does. All
      resizable columns when `keys` is omitted. */
  autosizeColumns(keys?: string[]): void;
  /** Download the current view (after filter and sort) as CSV. */
  exportCSV(filename?: string): Promise<void>;
  /** Snapshot of the user's layout: order, widths, hidden, pins, sorts, filters. */
  getState(): GridState;
  /** Restore a snapshot, reconciled against the columns as they are now.
      Returns false when the state is unusable (foreign version, not an object). */
  applyState(state: unknown): boolean;
  /** Realtime fast path: write `[rowId, fields]` patches into the rows in
      place and repaint only the rendered rows they change. Rows may be plain
      objects (no $state proxy) — far cheaper per write in a busy feed. Feed it
      a tick stream: `createTickStream({ apply: (b) => api.patchRows(b) })`.
      Sort and filter catch up on the next view change, as for any live data.
      Returns how many rows changed. */
  patchRows(patches: Iterable<readonly [string | number, Record<string, unknown>]>): number;
  /** Re-run filter and sort against the rows' current values. Values that
      change in place (a feed) never re-sort the view by themselves — that would
      mean re-sorting on every tick — so call this when the order should catch
      up, e.g. every second on a "top movers" board. */
  refresh(): void;
}

/** The `scrollTop` that brings a row of `rowH` at `rowTop` into a viewport of
    `viewH` currently scrolled to `viewTop`. Never negative. */
export function scrollTopFor(
  align: ScrollAlign,
  rowTop: number,
  rowH: number,
  viewTop: number,
  viewH: number,
): number {
  let target: number;
  switch (align) {
    case 'start':
      target = rowTop;
      break;
    case 'end':
      target = rowTop + rowH - viewH;
      break;
    case 'center':
      target = rowTop + rowH / 2 - viewH / 2;
      break;
    default:
      if (rowTop < viewTop) target = rowTop;
      else if (rowTop + rowH > viewTop + viewH) target = rowTop + rowH - viewH;
      else target = viewTop;
  }
  return Math.max(0, target);
}
