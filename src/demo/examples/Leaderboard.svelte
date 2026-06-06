<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A leaderboard: rank medals and score progress bars (custom cells), sorted by
  // score. Shows two distinct custom-cell renderers in one grid plus rowClass for
  // the podium rows.
  interface Player extends GridRow {
    rank: number;
    name: string;
    level: number;
    winRate: number;
    score: number;
  }

  const NAMES = [
    'Nova', 'Vortex', 'Echo', 'Cipher', 'Blaze', 'Quartz', 'Specter', 'Riot', 'Onyx', 'Pulse',
    'Drift', 'Halo', 'Zephyr', 'Crux', 'Ember', 'Volt', 'Sable', 'Mirage', 'Frost', 'Talon',
  ];

  function build(): Player[] {
    const players = NAMES.map((name, i) => ({
      id: i,
      flashSeq: 0,
      flashDir: 'up' as const,
      rank: 0,
      name: `${name}${(i * 7) % 90}`,
      level: 12 + ((i * 13) % 78),
      winRate: 35 + ((i * 17) % 60),
      score: 1000 + ((i * 2659) % 9000),
    }));
    // Rank by score, descending.
    players.sort((a, b) => b.score - a.score);
    players.forEach((p, i) => (p.rank = i + 1));
    return players;
  }

  const rows = $state<Player[]>(build());
  const gridRows = $derived(rows as unknown as GridRow[]);
  const maxScore = Math.max(...rows.map((r) => r.score));

  // The current player, pinned to the top so you never lose your standing.
  const youRow: GridRow = {
    id: 999,
    flashSeq: 0,
    flashDir: 'up',
    rank: 42,
    name: 'You',
    level: 50,
    winRate: 58,
    score: Math.round(maxScore * 0.62),
  } as unknown as GridRow;
  const MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

  const columns: ColumnDef[] = [
    { type: 'custom', key: 'rank', header: '#', width: 56, sortable: false },
    { type: 'text', key: 'name', header: 'Player', width: 150 },
    { type: 'number', key: 'level', header: 'Lv', width: 64, decimals: 0 },
    { type: 'percent', key: 'winRate', header: 'Win %', width: 88 },
    { type: 'number', key: 'score', header: 'Score', width: 104, decimals: 0 },
    { type: 'custom', key: 'progress', header: '', flex: 1, sortable: false },
  ];
</script>

{#snippet cell({ row, column }: { row: GridRow; column: ColumnDef })}
  {#if column.key === 'rank'}
    {@const rk = (row as Player).rank}
    <span class="rank" class:podium={rk <= 3}>{MEDALS[rk] ?? rk}</span>
  {:else if column.key === 'progress'}
    <div class="bar"><div class="fill" style:width="{((row as Player).score / maxScore) * 100}%"></div></div>
  {/if}
{/snippet}

<div class="controls">
  <span class="stat">{rows.length} players · sorted by score</span>
  <span class="dot">·</span>
  <span class="stat">your row stays pinned at the top</span>
</div>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme={ui.theme}
    height={rows.length * 36 + 40}
    rowClass={(r) => ((r as Player).rank <= 3 ? 'podium-row' : '')}
    pinnedRows={[youRow]}
    {cell}
  />
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text-dim);
  }
  .dot {
    color: var(--border);
  }
  .rank {
    font-family: var(--mono);
    font-variant-numeric: tabular-nums;
    color: var(--text-dim);
  }
  .rank.podium {
    font-size: 15px;
  }
  .bar {
    width: 100%;
    height: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    overflow: hidden;
  }
  .bar .fill {
    height: 100%;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--up), #6366f1);
  }
  :global(.bo-grid .row.podium-row) {
    background: rgba(99, 102, 241, 0.08);
  }
  .gridwrap {
    max-width: 720px;
  }
</style>
