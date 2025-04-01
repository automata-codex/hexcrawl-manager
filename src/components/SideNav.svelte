<script lang="ts">
  let open = false;
</script>

<button on:click={() => open = !open}>☰ Toggle Menu</button>

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
