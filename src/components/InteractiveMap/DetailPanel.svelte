<script lang="ts">
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import type { HexData } from '../../types.ts';

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
  {#if $selectedHex}
    <p>Hex Details</p>
    <div>
      <p>Selected hex: {$selectedHex?.toUpperCase()}</p>
      <p>{currentHex?.name}</p>
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
    }
    .hex-panel.open {
        transform: translateX(0%);
    }
    .open-panel-button {
        position: absolute;
        top: 1rem;
        left: 1rem;
        z-index: 1100;
    }
</style>
