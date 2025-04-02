<script lang="ts">
  function openSidebar() {
    window.dispatchEvent(new CustomEvent('toggle-sidebar'));
  }
</script>
<style>
  button {
      color: var(--bulma-link-text);
      cursor: pointer;
      text-decoration: none;
      transition-duration: var(--bulma-duration);
      transition-property: background-color,border-color,color;
  }
</style>

<button onclick={openSidebar}>side menu</button>
