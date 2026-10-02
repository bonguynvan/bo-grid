<script lang="ts">
  import type { CellTypeProps } from '../../../lib';

  // A registered cell type's renderer: an ISO country code drawn as a region
  // dot + country name. The grid passes value/row/column and the formatted text.
  let { value }: CellTypeProps = $props();

  const COUNTRIES: Record<string, { name: string; region: 'apac' | 'emea' | 'amer' }> = {
    VN: { name: 'Vietnam', region: 'apac' },
    SG: { name: 'Singapore', region: 'apac' },
    JP: { name: 'Japan', region: 'apac' },
    IN: { name: 'India', region: 'apac' },
    DE: { name: 'Germany', region: 'emea' },
    US: { name: 'United States', region: 'amer' },
    BR: { name: 'Brazil', region: 'amer' },
  };

  const code = $derived(String(value ?? '').toUpperCase());
  const info = $derived(COUNTRIES[code]);
</script>

<span class="country-cell" title={code}>
  <span class="dot {info?.region ?? ''}" aria-hidden="true"></span>{info?.name ?? code}
</span>

<style>
  .country-cell {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .dot {
    flex: 0 0 auto;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--bo-text-dim);
  }
  .dot.apac {
    background: #f59e0b;
  }
  .dot.emea {
    background: #818cf8;
  }
  .dot.amer {
    background: #34d399;
  }
</style>
