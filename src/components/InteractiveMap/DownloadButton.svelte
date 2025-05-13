<script lang="ts">
  import { faArrowDownToBracket } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { fade } from 'svelte/transition';

  let isOpen = $state(false);
</script>
<style>
    .open-panel-button {
        height: 2.5rem;
        width: 2.5rem;
    }
</style>

<div class="dropdown is-right is-active">
  <!-- Toggle Button -->
  <div class="dropdown-trigger">
    <button class="button open-panel-button" aria-haspopup="true" aria-controls="dropdown-menu" onclick={() => (isOpen = !isOpen)}>
      <FontAwesomeIcon icon={faArrowDownToBracket} />
    </button>
  </div>

  <!-- Dropdown Menu -->
  {#if isOpen}
    <div class="dropdown-menu" id="dropdown-menu" role="menu" transition:fade>
      <div class="dropdown-content">
        <button class="dropdown-item" onclick={() => { isOpen = false; /* exportCurrentView() */ }}>
          Export Current View
        </button>
        <button class="dropdown-item" onclick={() => { isOpen = false; /* exportFullMap() */ }}>
          Export Full Map
        </button>
      </div>
    </div>
  {/if}
</div>
