<script lang="ts">
  import { faLayerGroup } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  let isOpen = $state(false);
</script>

<!-- Toggle Button -->
<button class="button open-panel-button" onclick={() => isOpen = !isOpen}>
  <FontAwesomeIcon icon={faLayerGroup} />
</button>

<style>
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
