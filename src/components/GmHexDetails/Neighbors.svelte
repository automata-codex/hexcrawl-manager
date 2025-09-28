<script lang="ts">
  import { getHexNeighbors } from '@skyreach/core';

  import { getHexPath } from '../../config/routes.ts';


  import type { HexData } from '@skyreach/schemas';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();
  const neighbors = $derived(getHexNeighbors(hex.id));
</script>

<div class="data-bar-cell">Neighbors:</div>
{#each neighbors as neighbor (neighbor)}
  <div class="data-bar-cell">
    <a href={getHexPath(neighbor)}>{neighbor}</a>
  </div>
{/each}
