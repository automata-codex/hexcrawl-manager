<script lang="ts">
  import { getHexNeighbors } from '@achm/core';

  import { getHexPath } from '../../config/routes.ts';

  import type { HexData, MapConfig } from '@achm/schemas';

  interface Props {
    hex: HexData;
    mapConfig: MapConfig;
  }

  const { hex, mapConfig }: Props = $props();
  const neighbors = $derived(
    getHexNeighbors(hex.id, mapConfig.grid.notation, mapConfig),
  );
</script>

<div class="data-bar-cell"><span class="inline-heading">Neighbors:</span></div>
{#each neighbors as neighbor (neighbor)}
  <div class="data-bar-cell">
    <a href={getHexPath(neighbor)}>{neighbor}</a>
  </div>
{/each}
