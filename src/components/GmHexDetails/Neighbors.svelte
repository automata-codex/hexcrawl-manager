<script lang="ts">
  import { getHexNeighbors } from '../../../lib/hexes/get-hex-neighbors.ts';
  import { getHexPath } from '../../config/routes.ts';

  import type { HexData } from '../../types.ts';

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
