<script lang="ts">
  import { getHexPath, getRegionPath } from '../../config/routes.ts';
  import { getRegionShortTitle } from '../../utils/regions.ts';

  import Dungeon from './Dungeon.svelte';
  import Explored from './Explored.svelte';
  import Pointcrawls from './Pointcrawls.svelte';
  import Visited from './Visited.svelte';

  import type { DungeonEntry, ExtendedHexData, PointcrawlLink } from '../../types.ts';

  interface Props {
    dungeons: DungeonEntry[];
    hex: ExtendedHexData;
    pointcrawls?: PointcrawlLink[];
  }

  const { dungeons, hex, pointcrawls }: Props = $props();
</script>

<div class="data-bar">
  <Visited {hex} />
  {#if hex.renderedHiddenSites.length > 0}
    <Explored isExplored={hex.isExplored} />
  {/if}
  <div class="data-bar-cell">
    <a href={getHexPath(hex.id)}>View Hex</a>
  </div>
  <div class="data-bar-cell">
    <a href={getRegionPath(hex.regionId)}>{getRegionShortTitle(hex.regionId, hex.regionName)}</a>
  </div>
  <Dungeon {dungeons} {hex} />
  <Pointcrawls {pointcrawls} />
</div>
{#if hex.renderedLandmark}
  <p class="hanging-indent">
    <span class="inline-heading">Landmark:</span>
    {@html hex.renderedLandmark}
  </p>
{/if}
{#if hex.renderedHiddenSites.length > 0}
  <div>
    <span class="inline-heading">Hidden Sites:</span>
    <ul class="compact-list">
      {#each hex.renderedHiddenSites as site (site.description)}
        <li>{@html site.description}</li>
      {/each}
    </ul>
  </div>
{/if}
{#if hex.renderedNotes.length > 0}
  <div>
    <span class="inline-heading">Notes:</span>
    <ul class="compact-list">
      {#each hex.renderedNotes as note (note.content)}
        <li>{@html note.content}</li>
      {/each}
    </ul>
  </div>
{/if}
{#if hex.secretSite}
  <p class="hanging-indent">
    <span class="inline-heading">Secret Site:</span>
    {@html hex.renderedSecretSite}
  </p>
{/if}

<style>
  .data-bar {
    display: flex;
    font-weight: bold;
  }

  :global(.data-bar-cell) {
    margin-right: 1rem;
  }

  .compact-list {
    list-style-type: disc;
    margin: 0 0 0 1rem;
    padding-left: 1rem;
  }

  p.hanging-indent {
    margin-bottom: 0;
  }
</style>
