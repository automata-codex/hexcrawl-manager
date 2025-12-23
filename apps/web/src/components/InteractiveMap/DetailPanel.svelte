<script lang="ts">
  import { parseTrailId } from '@achm/core';
  import {
    faMountainSun,
    faSidebar,
    faXmark,
  } from '@fortawesome/pro-light-svg-icons';
  import { faDungeon } from '@fortawesome/pro-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';

  import {
    getDungeonPath,
    getHexPath,
    getRegionPath,
  } from '../../config/routes.ts';
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import { canAccess } from '../../utils/auth.ts';
  import { SCOPES } from '../../utils/constants.ts';
  import {
    getFavoredTerrain,
    getTravelDifficulty,
  } from '../../utils/interactive-map.ts';
  import { getRegionShortTitle } from '../../utils/regions.ts';
  import Explored from '../GmHexDetails/Explored.svelte';
  import ThemeToggle from '../ThemeToggle.svelte';

  import CheckBoxIcon from './CheckBoxIcon.svelte';

  import type { DungeonEssentialData } from '../../pages/api/dungeons.json.ts';
  import type { HexPlayerData } from '../../pages/api/hexes.json.ts';
  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import type { CoordinateNotation, TrailEntry } from '@achm/schemas';

  interface Props {
    dungeons: DungeonEssentialData[];
    hexes: HexPlayerData[];
    mapPaths: MapPathPlayerData[];
    notation: CoordinateNotation;
    role: string | null;
  }

  interface LocalTrailData {
    to: string;
    permanent: boolean;
    lastSeasonTouched: string;
  }

  const { dungeons, hexes, notation, role }: Props = $props();

  let isOpen = $state(!!$selectedHex);
  let trails: TrailEntry[] = $state([]);

  const currentHex = $derived(
    hexes.find((hex) => hex.id?.toLowerCase() === $selectedHex?.toLowerCase()),
  );
  const dungeonsInHex = $derived(
    dungeons.filter(
      (dungeon) => dungeon.hexId.toLowerCase() === $selectedHex?.toLowerCase(),
    ),
  );
  const trailsInHex = $derived(
    trails.filter((trail) => {
      const hexIds = parseTrailId(trail.id, notation);
      if (!hexIds) {
        return false;
      }
      const { from, to } = hexIds;
      return (
        from.toLowerCase().includes($selectedHex?.toLowerCase() ?? '') ||
        to.toLowerCase().includes($selectedHex?.toLowerCase() ?? '')
      );
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

  function formatTrailData(trail: TrailEntry): LocalTrailData {
    const hexIds = parseTrailId(trail.id, notation);
    if (!hexIds) {
      throw new Error(`Invalid trail ID: ${trail.id}`);
    }
    const { from, to } = hexIds;
    return {
      to: to === $selectedHex ? from : to,
      permanent: trail.permanent,
      lastSeasonTouched: trail.lastSeasonTouched,
    };
  }

  /* eslint-disable svelte/no-useless-mustaches */
</script>

<!-- Floating Controls -->
<div class="floating-controls">
  <a href="/" class="button control-button" aria-label="Home">
    <FontAwesomeIcon icon={faMountainSun} />
  </a>
  <div class="button theme-toggle-wrapper">
    <ThemeToggle />
  </div>
  <button class="button control-button" onclick={() => (isOpen = !isOpen)} aria-label="Toggle detail panel">
    <FontAwesomeIcon icon={faSidebar} />
  </button>
</div>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="hex-panel">
  <header class="panel-header">
    <span class="panel-title">Hex Details</span>
    <button
      class="panel-close-button"
      onclick={() => (isOpen = false)}
      aria-label="Close panel"
    >
      <FontAwesomeIcon icon={faXmark} />
    </button>
  </header>
  {#if $selectedHex}
    <h2 class="title is-5" style="text-align: center">
      {$selectedHex?.toUpperCase()}: {currentHex?.name}
    </h2>
    <div>
      {#if canAccess(role, [SCOPES.GM])}
        <div class="hex-data-bar">
          <div>
            <a href={getHexPath($selectedHex)}>View Hex</a>
          </div>
          <div>
            <a href={getRegionPath(currentHex?.regionId ?? '')}
              >{getRegionShortTitle(currentHex?.regionId ?? '', currentHex?.regionName)}</a
            >
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
          <span class="inline-heading">Visited:</span>{' '}
          <CheckBoxIcon checked={currentHex?.isVisited ?? false} />
        </div>
        {#if currentHex && (!currentHex.isExplored || currentHex.hasHiddenSites)}
          <Explored isExplored={currentHex.isExplored} />
        {/if}
      </div>
      <div class="hex-data-list">
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
          <span class="inline-heading">Landmark:</span
          >{' '}{@html currentHex?.renderedLandmark}
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
        {#if currentHex?.topography}
          <p class="hanging-indent">
            <span class="inline-heading">Topography:</span>
            {' '}
            {currentHex.topography}
          </p>
        {/if}
      </div>
      {#if trailsInHex.length > 0}
        <h3 class="title is-5">Trails</h3>
        <ul>
          {#each trailsInHex.map(formatTrailData) as trail (trail.to)}
            <li>
              <div>
                <span>
                  <span style="font-weight: bold">To:</span
                  >{' '}{trail.to.toUpperCase()}
                </span>
                &mdash;
                <span>
                  <span style="font-weight: bold">Permanent:</span
                  >{' '}<CheckBoxIcon checked={trail.permanent} />
                </span>
              </div>
              <div>
                <span style="font-weight: bold">Last used:</span
                >{' '}{trail.lastSeasonTouched}
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

  .hex-data-list {
    p {
      margin-bottom: 0;
    }
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

  .floating-controls {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 900;
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }

  .control-button {
    height: 2.5rem;
    width: 2.5rem;
  }

  .control-button:hover {
    background: #888;
  }

  .theme-toggle-wrapper {
    height: 2.5rem;
    padding: 0.25rem;
    display: flex;
    align-items: center;
  }

  /* Light mode - explicit theme selection */
  :global(html[data-theme='light']) .control-button:hover {
    background: #ddd;
  }

  /* Light mode - system preference when no explicit theme */
  @media (prefers-color-scheme: light) {
    :global(html:not([data-theme])) .control-button:hover {
      background: #ddd;
    }
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--bulma-border);
  }

  .panel-title {
    font-weight: 600;
    color: var(--bulma-text-weak);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .panel-close-button {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: var(--bulma-text-weak);
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .panel-close-button:hover {
    color: var(--bulma-text);
  }
</style>
