<script lang="ts">
  import { getCluePath, getHexPath, getRegionPath } from '../../config/routes.ts';
  import { getRegionShortTitle } from '../../utils/regions.ts';

  import Dungeon from './Dungeon.svelte';
  import Explored from './Explored.svelte';
  import HiddenSites from './HiddenSites.svelte';
  import KeyedEncounters from './KeyedEncounters.svelte';
  import Landmark from './Landmark.svelte';
  import Neighbors from './Neighbors.svelte';
  import Pointcrawls from './Pointcrawls.svelte';
  import Visited from './Visited.svelte';

  import type { MapConfig } from '@achm/schemas';

  import type {
    ClueMapEntry,
    DungeonEntry,
    EncounterMapEntry,
    ExtendedHexData,
    PointcrawlLink,
  } from '../../types.ts';

  interface Props {
    clueMap?: Record<string, ClueMapEntry>;
    dungeons: DungeonEntry[];
    encounterMap?: Record<string, EncounterMapEntry>;
    hex: ExtendedHexData;
    mapConfig: MapConfig;
    pointcrawls?: PointcrawlLink[];
    showSelfLink?: boolean;
  }

  const {
    clueMap = {},
    dungeons,
    encounterMap = {},
    hex,
    mapConfig,
    pointcrawls,
    showSelfLink = true,
  }: Props = $props();
</script>

{#if hex.updates}
  <div class="box updates">
    <p class="warning">⚠️ Updates ⚠️</p>
    <ul>
      {#each hex.renderedUpdates as update (update)}
        <li>{@html update}</li>
      {/each}
    </ul>
  </div>
{/if}
<div class="data-bar">
  <Visited {hex} />
  {#if hex.renderedHiddenSites.length > 0}
    <Explored {hex} />
  {/if}
  {#if showSelfLink}
    <div class="data-bar-cell">
      <a href={getHexPath(hex.id)}>View Hex</a>
    </div>
  {/if}
  <div class="data-bar-cell">
    <a href={getRegionPath(hex.regionId)}>{getRegionShortTitle(hex.regionId, hex.regionName)}</a>
  </div>
  <Dungeon {dungeons} {hex} />
  <Pointcrawls {pointcrawls} />
</div>
<div class="data-bar">
  <Neighbors {hex} {mapConfig} />
</div>
{#if hex.topography}
  <p class="hanging-indent">
    <span class="inline-heading">Topography:</span>
    {' '}
    {hex.topography}
  </p>
{/if}
<Landmark {hex} {clueMap} />
<HiddenSites {hex} {clueMap} />
<KeyedEncounters {hex} {encounterMap} />
{#if hex.secretSite}
  <div class="hanging-indent">
    <span class="inline-heading">Secret Site:</span>{' '}
    {@html hex.renderedSecretSite}
  </div>
{/if}
{#if hex.notes}
  <p class="hanging-indent">
    <span class="inline-heading">GM&rsquo;s Notes:</span>
  </p>
  <ul class="gm-notes">
    {#each hex.renderedNotes as note (note.content)}
      <li>
        {@html note.content}
        {#if note.clueId}
          &rarr; <a href={getCluePath(note.clueId)}>{clueMap[note.clueId]?.name ?? note.clueId}</a>
        {/if}
      </li>
    {/each}
  </ul>
{/if}

<style>
  .data-bar {
    display: flex;
    font-weight: bold;
  }

  :global(.data-bar-cell) {
    margin-right: 1rem;
  }

  .gm-notes {
    margin-bottom: 0;
  }

  .updates {
    padding: 1rem;
    margin: 1rem 0;
  }

  .updates ul {
    padding-left: 1rem;
  }

  .warning {
    background-color: var(--bulma-danger);
    color: var(--bulma-white);
    font-weight: bold;
    padding: 1rem;
    text-align: center;
    margin: 0 0 1rem;
  }
</style>
