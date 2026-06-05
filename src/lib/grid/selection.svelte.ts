export interface CellRef {
  r: number;
  c: number;
}

export interface Bounds {
  r0: number;
  c0: number;
  r1: number;
  c1: number;
}

/**
 * Rectangular cell selection defined by an anchor and a focus corner.
 * Positional (by view row/column index), so it survives sort/filter the way a
 * spreadsheet selection does. State is reactive ($state) so the grid re-renders
 * cell highlighting and the aggregation bar as the selection changes.
 */
export class Selection {
  anchor = $state<CellRef | null>(null);
  focus = $state<CellRef | null>(null);

  get bounds(): Bounds | null {
    if (!this.anchor || !this.focus) return null;
    return {
      r0: Math.min(this.anchor.r, this.focus.r),
      r1: Math.max(this.anchor.r, this.focus.r),
      c0: Math.min(this.anchor.c, this.focus.c),
      c1: Math.max(this.anchor.c, this.focus.c),
    };
  }

  get count(): number {
    const b = this.bounds;
    if (!b) return 0;
    return (b.r1 - b.r0 + 1) * (b.c1 - b.c0 + 1);
  }

  start(r: number, c: number): void {
    this.anchor = { r, c };
    this.focus = { r, c };
  }

  extendTo(r: number, c: number): void {
    if (this.anchor) this.focus = { r, c };
    else this.start(r, c);
  }

  selectAll(rows: number, cols: number): void {
    if (rows <= 0 || cols <= 0) return;
    this.anchor = { r: 0, c: 0 };
    this.focus = { r: rows - 1, c: cols - 1 };
  }

  /** Move the focus by (dr, dc), clamped. When extend is false, collapse to it. */
  move(dr: number, dc: number, extend: boolean, maxR: number, maxC: number): void {
    const f = this.focus ?? { r: 0, c: 0 };
    const next = {
      r: Math.max(0, Math.min(maxR, f.r + dr)),
      c: Math.max(0, Math.min(maxC, f.c + dc)),
    };
    this.focus = next;
    if (!extend || !this.anchor) this.anchor = next;
  }

  contains(r: number, c: number): boolean {
    const b = this.bounds;
    return !!b && r >= b.r0 && r <= b.r1 && c >= b.c0 && c <= b.c1;
  }

  isFocus(r: number, c: number): boolean {
    return this.focus?.r === r && this.focus?.c === c;
  }

  clear(): void {
    this.anchor = null;
    this.focus = null;
  }
}
