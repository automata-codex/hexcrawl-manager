<script lang="ts">
  import { faXmark } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import type { HexData } from '../../types.ts';
  import { getHexPath } from '../../utils/routes.ts';

  interface Props {
    hexes: HexData[];
  }

  const { hexes }: Props = $props();

  const currentHex = $derived(hexes.find((hex) => hex.id.toLowerCase() === $selectedHex?.toLowerCase()));

  let isOpen = $state(!!$selectedHex);
</script>

<!-- Toggle Button -->
<button class="button is-primary open-panel-button" onclick={() => isOpen = !isOpen}>
  {isOpen ? 'Close' : 'Open'} Panel
</button>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="hex-panel">
  <button class="hex-panel-close" onclick={() => isOpen = false} aria-label="Close menu">
    <FontAwesomeIcon icon={faXmark} />
  </button>
  {#if $selectedHex}
    <h2 class="title is-5" style="text-align: center">{$selectedHex?.toUpperCase()}: {currentHex?.name}</h2>
    <div>
      <p><a href={getHexPath($selectedHex)}>View Hex</a></p>
      <p>Dungeons: unknown</p>
      <p>Terrain: {currentHex?.terrain}</p>
      <p>Vegetation: {currentHex?.vegetation}</p>
      <p>Landmark: {currentHex?.landmark}</p>
      <p>Region: {currentHex?.regionId}</p>
      <p>Visited: {currentHex?.isVisited ?? false}</p>
      <p>Explored: {currentHex?.isExplored ?? false}</p>
    </div>
  {:else}
    <p>Please select a hex to get started.</p>
  {/if}
</aside>

<style>
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
