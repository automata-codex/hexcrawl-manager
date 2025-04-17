<script lang="ts">
  import type { HexData } from '../../types.ts';
  import { getRegionTitle } from '../../utils/id-parsers.ts';
  import { getHexPath, getRegionPath } from '../../utils/routes.ts';
  import Explored from './Explored.svelte';
  import Visited from './Visited.svelte';

  interface Props {
    hex: HexData;
    showSelfLink?: boolean;
  }

  const { hex, showSelfLink = true }: Props = $props();
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
  </div>
