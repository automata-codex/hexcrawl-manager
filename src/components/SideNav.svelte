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

{#if open}
  <aside>
    <nav>
      <ul>
        <li><a href="/heritage">Heritage</a></li>
        <li><a href="/regions">Regions</a></li>
      </ul>
    </nav>
  </aside>
{/if}
