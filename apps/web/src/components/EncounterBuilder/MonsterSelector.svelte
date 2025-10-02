<script lang="ts">
  import { encounterBuilderStore } from '../../stores/encounter-builder';
  import { getXpForCr } from '../../utils/xp';

  let searchQuery = $state('');

  // Filtered list of monsters based on search
  let filteredMonsters = $derived(
    $encounterBuilderStore.statBlocks
      .filter((monster) =>
        monster.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  );

  function handleAddMonster(monsterId: string) {
    encounterBuilderStore.addMonsterToEncounter(monsterId);
  }
</script>

<div class="field">
  <label class="label" for="monster-query">Search Monsters</label>
  <div class="control">
    <input
      id="monster-query"
      class="input"
      type="text"
      placeholder="Type to search..."
      bind:value={searchQuery}
    />
  </div>
</div>

<div class="box" style="max-height: 400px; overflow-y: auto;">
  {#if filteredMonsters.length > 0}
    <table class="table is-fullwidth is-striped is-hoverable">
      <thead>
        <tr>
          <th>Name</th>
          <th>CR</th>
          <th>XP</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each filteredMonsters as monster}
          <tr>
            <td>{monster.name}</td>
            <td>{monster.challenge_rating}</td>
            <td>{getXpForCr(monster.challenge_rating)}</td>
            <td>
              <button
                class="button is-small is-link"
                onclick={() => handleAddMonster(monster.id)}
              >
                Add
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="has-text-grey">No monsters found.</p>
  {/if}
</div>
