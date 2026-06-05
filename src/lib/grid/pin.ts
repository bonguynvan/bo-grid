import type { ColumnDef } from './column';
import { colWidth } from './column';

export interface PinInfo {
  pinned: boolean;
  /** Sticky left offset (px) when pinned. */
  left: number;
  /** Concrete width (px). */
  width: number;
}

export interface PinLayout {
  /** Columns with pinned ones moved to the front. */
  columns: ColumnDef[];
  info: PinInfo[];
  /** Sum of all column widths (the horizontally-scrollable content width). */
  totalWidth: number;
  anyPinned: boolean;
}

/**
 * Arrange columns for pinning: pinned-left columns move to the front, and each
 * gets a sticky `left` offset (cumulative width of the pinned columns before it).
 * When nothing is pinned, column order is untouched and the grid stays in its
 * default fit-to-width layout.
 */
export function arrangePinned(cols: readonly ColumnDef[]): PinLayout {
  const pinned = cols.filter((c) => c.pinned);
  const anyPinned = pinned.length > 0;
  const columns = anyPinned ? [...pinned, ...cols.filter((c) => !c.pinned)] : [...cols];

  const info: PinInfo[] = [];
  let left = 0;
  let totalWidth = 0;
  for (let i = 0; i < columns.length; i++) {
    const width = colWidth(columns[i]);
    const isPinned = anyPinned && i < pinned.length;
    info.push({ pinned: isPinned, left: isPinned ? left : 0, width });
    if (isPinned) left += width;
    totalWidth += width;
  }
  return { columns, info, totalWidth, anyPinned };
}
