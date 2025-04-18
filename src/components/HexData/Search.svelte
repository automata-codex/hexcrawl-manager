<script lang="ts">
  interface Props {
    onSearch: (value: string) => void;
  }
  const props = $props();

  let query = $state('');

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    console.log(`>> input: ${target.value}`);
    props.onSearch?.(target.value);
    console.log(`>> onSearch: ${!!props.onSearch}`);
  }
</script>

<input
  type="text"
  bind:value={query}
  oninput={handleInput}
  placeholder="Search hexes..."
  class="input"
/>
