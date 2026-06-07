<script lang="ts">
  import { Grid, type ColumnDef, type GridRow } from '../../lib';
  import { ui } from '../theme.svelte';

  // A people/CRM board — shows bo-grid is a general business grid, not just
  // fintech: avatar, link, relative time, currency, status badge, progress,
  // rating, tags and a boolean.
  interface Member extends GridRow {
    name: string;
    email: string;
    role: string;
    status: string;
    lastActive: number;
    rate: number;
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
    const now = Date.now();
    return Array.from({ length: n }, (_, id) => {
      const skills = [...new Set([SKILLS[(id * 3) % SKILLS.length], SKILLS[(id * 7) % SKILLS.length]])];
      const first = FIRST[(id * 7) % FIRST.length];
      const last = LAST[(id * 13) % LAST.length];
      return {
        id,
        flashSeq: 0,
        flashDir: 'up' as const,
        name: `${first} ${last}`,
        email: `${first}.${last}@acme.io`.toLowerCase(),
        role: ROLES[(id * 5) % ROLES.length],
        status: STATUS[(id * 2) % STATUS.length],
        // Spread from a few minutes to ~3 days ago (deterministic).
        lastActive: now - (((id * 37) % 4320) + 3) * 60_000,
        rate: 60 + ((id * 11) % 120), // hourly rate
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
    // Pinned so the wide board scrolls horizontally with the person in view.
    { type: 'avatar', key: 'name', sub: 'role', header: 'Member', width: 200, pinned: true },
    { type: 'link', key: 'email', header: 'Email', width: 196, href: (row) => `mailto:${row.email}` },
    {
      type: 'badge',
      key: 'status',
      header: 'Status',
      width: 104,
      tones: { Active: 'up', Away: 'amber', Offline: 'neutral' },
    },
    { type: 'relative', key: 'lastActive', header: 'Last active', width: 124 },
    { type: 'currency', key: 'rate', header: 'Rate/hr', width: 96, currency: 'USD', decimals: 0 },
    { type: 'progress', key: 'workload', header: 'Workload', width: 140, min: 0, max: 100 },
    { type: 'rating', key: 'rating', header: 'Rating', width: 110, max: 5 },
    { type: 'tags', key: 'skills', header: 'Skills', flex: 1, minWidth: 160 },
    { type: 'boolean', key: 'remote', header: 'Remote', width: 104, trueLabel: 'Remote', falseLabel: 'Office' },
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
