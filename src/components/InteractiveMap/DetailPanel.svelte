<script lang="ts">
  import { faSidebar, faXmark } from '@fortawesome/pro-light-svg-icons';
  import { faDungeon } from '@fortawesome/pro-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import type { HexData } from '../../types.ts';
  import { getRegionTitle } from '../../utils/regions.ts';
  import { getDungeonPath, getHexPath, getRegionPath } from '../../utils/routes.ts';
  import CheckBoxIcon from './CheckBoxIcon.svelte';
  import type { DungeonEssentialData } from '../../pages/api/dungeons.json.ts';

  interface Props {
    dungeons: DungeonEssentialData[];
    hexes: HexData[];
  }

  const { dungeons, hexes }: Props = $props();

  const currentHex = $derived(hexes.find((hex) => hex.id.toLowerCase() === $selectedHex?.toLowerCase()));
  const dungeonsInHex = $derived(
    dungeons.filter((dungeon) => dungeon.hexId.toLowerCase() === $selectedHex?.toLowerCase())
  );

  let isOpen = $state(!!$selectedHex);

  function formatText(text?: string) {
    if (!text) return '';
    return text
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (char) => char.toUpperCase());
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
      <div class="hex-data-bar">
        <div>
          Visited:{' '}
          <CheckBoxIcon checked={currentHex?.isVisited ?? false} />
        </div>
        <div>
          Explored:{' '}
          <CheckBoxIcon checked={currentHex?.isExplored ?? false} />
        </div>
      </div>
      <p class="hanging-indent">
        <span class="inline-heading">Terrain:</span>
        {' '}
        {formatText(currentHex?.terrain)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Vegetation:</span>
        {' '}
        {formatText(currentHex?.vegetation)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Biome:</span>
        {' '}
        {formatText(currentHex?.biome)}
      </p>
      <p class="hanging-indent">
        <span class="inline-heading">Landmark:</span>{' '}{currentHex?.landmark}
      </p>
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
        box-shadow: 2px 0 5px rgba(0,0,0,0.5);
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
