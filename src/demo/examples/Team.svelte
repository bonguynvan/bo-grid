<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A people/CRM board — shows bo-grid is a general business grid, not just
  // fintech: avatar, status badge, progress, rating, tags and a boolean.
  interface Member extends GridRow {
    name: string;
    role: string;
    status: string;
    workload: number;
    rating: number;
    skills: string[];
    remote: boolean;
  }

  const FIRST = ['Ava', 'Liam', 'Mia', 'Noah', 'Zoe', 'Ravi', 'Yuki', 'Omar', 'Lena', 'Theo', 'Ines', 'Kai'];
  const LAST = ['Chen', 'Patel', 'Kim', 'Garcia', 'Nguyen', 'Haddad', 'Rossi', 'Silva', 'Okafor', 'Novak'];
  const ROLES = ['Engineer', 'Designer', 'PM', 'Analyst', 'Researcher', 'Writer'];
  const STATUS = ['Active', 'Away', 'Offline'];
  const SKILLS = ['TypeScript', 'Svelte', 'Design', 'SQL', 'Rust', 'Figma', 'Python', 'Go', 'CSS', 'Data viz'];

  function build(n: number): Member[] {
    return Array.from({ length: n }, (_, id) => {
      const skills = [...new Set([SKILLS[(id * 3) % SKILLS.length], SKILLS[(id * 7) % SKILLS.length]])];
      return {
        id,
        flashSeq: 0,
        flashDir: 'up' as const,
        name: `${FIRST[(id * 7) % FIRST.length]} ${LAST[(id * 13) % LAST.length]}`,
        role: ROLES[(id * 5) % ROLES.length],
        status: STATUS[(id * 2) % STATUS.length],
        workload: 18 + ((id * 17) % 80),
        rating: 1 + ((id * 3) % 5),
        skills,
        remote: id % 3 !== 0,
      };
    });
  }

  const rows = $state<Member[]>(build(40));
  const gridRows = $derived(rows as unknown as GridRow[]);

  const columns: ColumnDef[] = [
    { type: 'avatar', key: 'name', sub: 'role', header: 'Member', width: 210 },
    {
      type: 'badge',
      key: 'status',
      header: 'Status',
      width: 112,
      tones: { Active: 'up', Away: 'amber', Offline: 'neutral' },
    },
    { type: 'progress', key: 'workload', header: 'Workload', width: 150, min: 0, max: 100 },
    { type: 'rating', key: 'rating', header: 'Rating', width: 116, max: 5 },
    { type: 'tags', key: 'skills', header: 'Skills', flex: 1 },
    { type: 'boolean', key: 'remote', header: 'Remote', width: 110, trueLabel: 'Remote', falseLabel: 'Office' },
  ];
</script>

<div class="gridwrap">
  <Grid
    rows={gridRows}
    {columns}
    theme={ui.theme}
    filterMenu
    columnMenu
    height={560}
    ariaLabel="Team directory"
  />
</div>

<style>
  .gridwrap {
    max-width: 920px;
  }
</style>
