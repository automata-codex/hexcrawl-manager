<script lang="ts">
  import { faLayerGroup, faXmark } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { layerList, layerVisibility } from '../../stores/interactive-map/layer-visibility';
  import { canAccess } from '../../utils/auth.ts';

  interface Props {
    role: string | null;
  }

  const { role }: Props = $props();

  let isOpen = $state(false);

  function handleToggleClick(e: Event, key: string) {
    const input = e.target as HTMLInputElement;
    toggleLayer(key, input.checked);
  }

  function toggleLayer(key: string, checked: boolean) {
    layerVisibility.update(vis => ({ ...vis, [key]: checked }));
  }
</script>

<!-- Toggle Button -->
<button class="button open-panel-button" onclick={() => isOpen = !isOpen}>
  <FontAwesomeIcon icon={faLayerGroup} />
</button>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="layers-panel">
  <button class="layers-panel-close" onclick={() => isOpen = false} aria-label="Close menu">
    <FontAwesomeIcon icon={faXmark} />
  </button>
  {#each layerList as layer (layer.key)}
    {#if !layer.scopes || (layer.scopes && canAccess(role, layer.scopes))}
      <div>
        <label>
          <input
            type="checkbox"
            checked={$layerVisibility[layer.key]}
            onchange={(e) => handleToggleClick(e, layer.key)}
          />
          {layer.label}
        </label>
      </div>
    {/if}
  {/each}
</aside>

<style>
    .layers-panel {
        position: fixed;
        top: 1rem;
        right: 1rem;
        width: 250px;
        background-color: var(--bulma-body-background-color);
        box-shadow: 2px 0 5px rgba(0, 0, 0, 0.5);
        transform: translateX(+110%);
        transition: transform 0.3s ease;
        z-index: 1000;
        overflow-y: auto;
        margin-bottom: 0;
        padding: 0.5rem;
        border-radius: 0.5rem;
    }

    .layers-panel.open {
        transform: translateX(0%);
    }

    .layers-panel-close {
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

    .open-panel-button {
        height: 2.5rem;
        width: 2.5rem;
    }

    .open-panel-button:hover {
        background: #888;
    }
</style>
