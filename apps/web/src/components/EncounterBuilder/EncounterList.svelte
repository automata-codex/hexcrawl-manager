<script lang="ts">
  import { encounterBuilderStore } from '../../stores/encounter-builder';
  import { getXpForCr } from '../../utils/xp';

  // Helper to get full monster data from id
  function getMonsterById(id: string) {
    return $encounterBuilderStore.statBlocks.find((m) => m.id === id);
  }

  function handleQuantityChange(monsterId: string, e: Event) {
    const input = e.target as HTMLInputElement;
    const newQuantity = parseInt(input.value);
    encounterBuilderStore.setMonsterQuantity(monsterId, newQuantity);
  }

  function handleRemoveMonster(monsterId: string) {
    encounterBuilderStore.removeMonsterFromEncounter(monsterId);
  }
</script>

{#if $encounterBuilderStore.encounterMonsters.length > 0}
  <table class="table is-fullwidth is-striped is-hoverable">
    <thead>
      <tr>
        <th>Monster</th>
        <th>CR</th>
        <th>XP Each</th>
        <th>Quantity</th>
        <th>Total XP</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each $encounterBuilderStore.encounterMonsters as encounterMonster}
        {@const monster = getMonsterById(encounterMonster.id)}
        {#if monster}
          <tr>
            <td>{monster.name}</td>
            <td>{monster.challenge_rating}</td>
            <td>{getXpForCr(monster.challenge_rating)}</td>
            <td>
              <input
                class="input is-small"
                type="number"
                min="0"
                value={encounterMonster.quantity}
                oninput={(e) => handleQuantityChange(encounterMonster.id, e)}
                style="width: 5rem;"
              />
            </td>
            <td
              >{getXpForCr(monster.challenge_rating) *
                encounterMonster.quantity}</td
            >
            <td>
              <button
                class="button is-small is-danger"
                onclick={() => handleRemoveMonster(encounterMonster.id)}
              >
                Remove
              </button>
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
{:else}
  <p class="has-text-grey">No monsters in encounter yet.</p>
{/if}
