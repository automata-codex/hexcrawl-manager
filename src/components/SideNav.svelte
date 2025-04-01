<script lang="ts">
  import { onMount } from 'svelte';

  let open = $state(false);

  function toggleSidebar() {
    open = !open;
  }

  onMount(() => {
    window.addEventListener('toggle-sidebar', toggleSidebar);
    return () => {
      window.removeEventListener('toggle-sidebar', toggleSidebar);
    };
  });
</script>

<style>
    .sidebar-wrapper {
        position: fixed;
        top: 0;
        left: 0;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
    }

    .sidebar-wrapper.open {
        pointer-events: auto;
    }

    .sidebar {
        position: absolute;
        top: 0;
        left: 0;
        width: 250px;
        max-width: 80vw;
        height: 100%;
        background: #222;
        color: white;
        transform: translateX(-100%);
        transition: transform 0.3s ease-in-out;
        padding: 1rem;
        z-index: 1001;
    }

    .sidebar-wrapper.open .sidebar {
        transform: translateX(0);
    }
</style>

<div class="sidebar-wrapper" class:open={open}>
  <aside class="sidebar">
    <nav>
      <ul>
        <li><a href="/heritage">Heritage</a></li>
        <li><a href="/regions">Regions</a></li>
      </ul>
    </nav>
  </aside>
</div>
