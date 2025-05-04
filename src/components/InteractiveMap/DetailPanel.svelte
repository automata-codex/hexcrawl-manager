<script lang="ts">
  let isOpen = $state(false);
</script>

<!-- Toggle Button -->
<button class="button is-primary open-panel-button" onclick={() => isOpen = !isOpen}>
  {isOpen ? 'Close' : 'Open'} Panel
</button>

<!-- Sliding Panel -->
<aside class:open={isOpen} class="hex-panel panel">
  <p class="panel-heading">Hex Details</p>
  <div class="panel-block">
    <p>This will contain hex data later.</p>
  </div>
</aside>

<style>
    .hex-panel {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 300px;
        background: white;
        box-shadow: 2px 0 5px rgba(0,0,0,0.1);
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
