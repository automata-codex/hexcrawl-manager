<script lang="ts">
  import { faSidebar, faXmark } from '@fortawesome/pro-light-svg-icons';
  import { faDungeon } from '@fortawesome/pro-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';
  import Explored from '../GmHexDetails/Explored.svelte';
  import type { DungeonEssentialData } from '../../pages/api/dungeons.json.ts';
  import type { HexPlayerData } from '../../pages/api/hexes.json.ts';
  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import type { TrailData } from '../../types.ts';
  import { canAccess } from '../../utils/auth.ts';
  import { SCOPES } from '../../utils/constants.ts';
  import { getFavoredTerrain, getTravelDifficulty } from '../../utils/interactive-map.ts';
  import { getRegionTitle } from '../../utils/regions.ts';
  import { getDungeonPath, getHexPath, getRegionPath } from '../../utils/routes.ts';
  import CheckBoxIcon from './CheckBoxIcon.svelte';

  interface Props {
    dungeons: DungeonEssentialData[];
    hexes: HexPlayerData[];
    mapPaths: MapPathPlayerData[];
    role: string | null;
  }

  interface LocalTrailData {
    to: string;
    uses: number;
    lastUsed: string;
  }

  const { dungeons, hexes, mapPaths, role }: Props = $props();

  let isOpen = $state(!!$selectedHex);
  let trails: TrailData[] = $state([]);

  const currentHex = $derived(hexes.find((hex) => hex.id.toLowerCase() === $selectedHex?.toLowerCase()));
  const dungeonsInHex = $derived(
    dungeons.filter((dungeon) => dungeon.hexId.toLowerCase() === $selectedHex?.toLowerCase()),
  );
  const trailsInHex = $derived(
    trails
      .filter((trail) => {
        return trail.from.toLowerCase().includes($selectedHex?.toLowerCase() ?? '') ||
          trail.to.toLowerCase().includes($selectedHex?.toLowerCase() ?? '');
      }),
  );

  onMount(() => {
    (async () => {
      const trailsResponse = await fetch('/api/trails.json');
      trails = await trailsResponse.json();
    })();
  });

  function formatText(text?: string) {
    if (!text) return '';
    return text
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatTrailData(trail: TrailData): LocalTrailData {
    return {
      to: trail.to === $selectedHex ? trail.from : trail.to,
      uses: trail.uses,
      lastUsed: trail.lastUsed,
    };
  }
</script>

<!-- Toggle Button -->
<button class="button open-panel-button" onclick={() => isOpen = !isOpen}>
  <FontAwesomeIcon icon={faSidebar} />
</button>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="hex-panel">
  <button class="hex-panel-close" onclick={() => isOpen = false} aria-label="Close menu">
    <FontAwesomeIcon icon={faXmark} />
  </button>
  {#if $selectedHex}
    <h2 class="title is-5" style="text-align: center">{$selectedHex?.toUpperCase()}: {currentHex?.name}</h2>
    <div>
      {#if canAccess(role, [SCOPES.GM])}
        <div class="hex-data-bar">
          <div>
            <a href={getHexPath($selectedHex)}>View Hex</a>
          </div>
          <div>
            <a href={getRegionPath(currentHex?.regionId ?? '')}>{getRegionTitle(currentHex?.regionId ?? '')}</a>
          </div>
          <div>
            {#each dungeonsInHex as dungeon (dungeon.id)}
              <a href={getDungeonPath(dungeon.id)}>
                <FontAwesomeIcon icon={faDungeon} />
              </a>
              {' '}
            {/each}
          </div>
        </div>
      {/if}
      <div class="hex-data-bar">
        <div>
          Visited:{' '}
          <CheckBoxIcon checked={currentHex?.isVisited ?? false} />
        </div>
        {#if currentHex}
          <Explored hex={currentHex} />
        {/if}
      </div>
      <p class="hanging-indent">
        <span class="inline-heading">Terrain:</span>
        {' '}
        {formatText(currentHex?.terrain)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Biome:</span>
        {' '}
        {formatText(currentHex?.biome)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Landmark:</span>{' '}{@html currentHex?.renderedLandmark}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Travel Difficulty:</span>
        {' '}
        {getTravelDifficulty(currentHex?.biome, currentHex?.terrain)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Favored Terrain Type:</span>
        {' '}
        {getFavoredTerrain(currentHex?.biome, currentHex?.terrain)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Elevation:</span>
        {' '}
        {currentHex?.elevation.toLocaleString()} ft.
      </p>
      {#if trailsInHex.length > 0}
        <h3 class="title is-5">Trails</h3>
        <ul>
          {#each trailsInHex.map(formatTrailData) as trail (trail.to)}
            <li>
            <div>
              <span>
                <span style="font-weight: bold">To:</span>{' '}{trail.to.toUpperCase()}
              </span>
              <span>
                ({trail.uses} uses)
              </span>
            </div>
              <div>
                <span style="font-weight: bold">Last used:</span>{' '}{trail.lastUsed}
              </div>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  {:else}
    <p>Please select a hex to get started.</p>
  {/if}
</aside>

<style>
    .hex-data-bar {
        display: flex;
        font-weight: bold;
    }

    .hex-data-bar > div {
        margin-right: 1rem;
    }

    .hex-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 25%;
        min-width: 300px;
        background-color: var(--bulma-body-background-color);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        z-index: 1000;
        overflow-y: auto;
        margin-bottom: 0;
        padding: 0.5rem;
    }

    .hex-panel.open {
        transform: translateX(0%);
    }

    .open-panel-button {
        position: absolute;
        top: 1rem;
        left: 1rem;
        z-index: 900;
        height: 2.5rem;
        width: 2.5rem;
    }

    .open-panel-button:hover {
        background: #888;
    }

    .hex-panel-close {
        position: absolute;
        top: 0.5rem;
        right: 0.75rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #ccc;
        cursor: pointer;
        padding: 0.25rem;
        z-index: 1001;
    }
</style>
