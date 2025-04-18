<script lang="ts">
  import type { ExtendedHexData } from '../../types.ts';
  import TreasureTable from '../TreasureTable/TreasureTable.svelte';

  interface Props {
    hex: ExtendedHexData;
  }

  const { hex }: Props = $props();
</script>
{#if hex.renderedHiddenSites && hex.renderedHiddenSites.length > 0}
  {#if hex.renderedHiddenSites.length === 1}
    <div class="hanging-indent">
      <span class="inline-heading">Hidden Site:</span>{' '}
      {@html hex.renderedHiddenSites[0].description}
    </div>
    {#if hex.renderedHiddenSites[0].treasure}
       <TreasureTable treasure={hex.renderedHiddenSites[0].treasure} />
    {/if}
  {:else}
    <div>
      <span class="inline-heading keep-with-next">Hidden Sites:</span>
    </div>
    <ul>
      {#each hex.renderedHiddenSites as site}
        <li>
          {@html site.description}
          {#if site.treasure}
            <TreasureTable treasure={site.treasure} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}
