<script lang="ts">
  let query = $state('');

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement;

    const q = target.value.trim().toLowerCase();
    console.log(`>> q: ${q}`);
    console.log(`>> query: ${query}`);
    const hexIdRegex = /^[a-z]\d{1,2}$/i;

    document.querySelectorAll('.hex').forEach(el => {
      const html = el as HTMLElement;
      const id = html.dataset.hexId?.toLowerCase() ?? '';
      const name = html.dataset.hexName?.toLowerCase() ?? '';
      const landmark = html.dataset.hexLandmark?.toLowerCase() ?? '';
      const text = html.textContent?.toLowerCase() ?? '';

      html.hidden = !!q && !(
        hexIdRegex.test(q) ? id === q : (
          name.includes(q) || landmark.includes(q) || text.includes(q)
        )
      );
    });
  }
</script>

<input
  class="input"
  type="text"
  bind:value={query}
  oninput={handleSearch}
  placeholder="Search hexes..."
/>
