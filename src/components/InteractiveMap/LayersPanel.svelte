<script lang="ts">
  import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  let isOpen = $state(false);
</script>

<!-- Toggle Button -->
<button class="button open-panel-button" onclick={() => isOpen = !isOpen}>
  <FontAwesomeIcon icon={faLayerGroup} />
</button>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="layers-panel">
</aside>

<style>
    .layers-panel {
        position: fixed;
        top: 1rem;
        right: 1rem;
        width: 250px;
        background-color: var(--bulma-body-background-color);
        box-shadow: 2px 0 5px rgba(0,0,0,0.5);
        transform: translateX(+200%);
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

    .open-panel-button {
        position: absolute;
        top: 1rem;
        right: 1rem;
        z-index: 900;
        height: 2.5rem;
        width: 2.5rem;
    }

    .open-panel-button:hover {
        background: #888;
    }
</style>
