<script lang="ts">
  import type { DungeonEntry, ExtendedHexData } from '../../types.ts';
  import { getRegionTitle } from '../../utils/id-parsers.ts';
  import { getHexPath, getRegionPath } from '../../utils/routes.ts';
  import Explored from './Explored.svelte';
  import Visited from './Visited.svelte';
  import Dungeon from './Dungeon.svelte';
  import Neighbors from './Neighbors.svelte';
  import Landmark from './Landmark.svelte';
  import HiddenSites from './HiddenSites.svelte';

  interface Props {
    dungeons: DungeonEntry[]
    hex: ExtendedHexData;
    showSelfLink?: boolean;
  }

  const { dungeons, hex, showSelfLink = true }: Props = $props();
</script>
<style>
    .data-bar {
        display: flex;
        font-weight: bold;
    }

    :global(.data-bar-cell) {
        margin-right: 1rem;
    }
</style>
<div class="data-bar">
  <Visited {hex} />
  <Explored {hex} />
  {#if showSelfLink}
    <div class="data-bar-cell">
      <a href={getHexPath(hex.id)}>View Hex</a>
    </div>
  {/if}
  <div class="data-bar-cell">
    <a href={getRegionPath(hex.regionId)}>{getRegionTitle(hex.regionId)}</a>
  </div>
  <Dungeon {dungeons} {hex} />
</div>
<div class="data-bar">
  <Neighbors {hex} />
</div>
<Landmark {hex} />
<HiddenSites {hex} />
<!-- secret sites -->
<!-- notes sites -->
