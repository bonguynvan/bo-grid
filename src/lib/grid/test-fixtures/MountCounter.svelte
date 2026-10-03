<script module lang="ts">
  import type { GridRow } from '../column';
  /** Mount count (a remount shows up here) and the row last received. */
  export const mounts: { count: number; row: GridRow | null } = { count: 0, row: null };
</script>

<script lang="ts">
  let { row }: { value: unknown; row: GridRow; column: unknown; text: string } = $props();
  mounts.count++;
  $effect(() => {
    mounts.row = row;
  });
</script>

<span class="mc">{row.sym}:{row.px}</span>
