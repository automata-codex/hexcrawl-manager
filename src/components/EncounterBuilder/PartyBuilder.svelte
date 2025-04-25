<script lang="ts">
  import { type CurrentPartyMember, encounterBuilderStore } from '../../stores/encounter-builder';

  const { setOverrideLevel, removeFromParty, addToParty } = encounterBuilderStore;

  let selectedCharacterId = $state('');

  function calculateApl(party: CurrentPartyMember[]) {
    const levels = party.map((member) => member.overrideLevel ?? member.level);
    const sum = levels.reduce((a, b) => a + b, 0);
    return sum / Math.max(1, levels.length);
  }

  function handleAddCharacter() {
    if (selectedCharacterId) {
      addToParty(selectedCharacterId);
      selectedCharacterId = '';
    }
  }

  function handleLevelInput(e: Event, memberId: string) {
    const input = e.target as HTMLInputElement;
    setOverrideLevel(memberId, parseInt(input.value, 10));
  }
</script>

<div>
  <h2 class="title is-3">Party Builder</h2>

  <!-- Select Character -->
  <div class="field is-grouped">
    <div class="control">
      <div class="select">
        <select bind:value={selectedCharacterId}>
          <option value="">-- Select Character --</option>
          {#each $encounterBuilderStore.characters as character}
            <option value={character.id}>{character.displayName}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="control">
      <button type="submit" onclick={() => handleAddCharacter()} class="button">
        Add to Party
      </button>
    </div>
  </div>

  <!-- Current Party List -->
  <div class="box">
    {#if $encounterBuilderStore.currentParty.length === 0}
      <p class="has-text-grey">No characters selected.</p>
    {/if}

    {#each $encounterBuilderStore.currentParty as member}
      <div class="columns is-vcentered is-mobile">
        <div class="column">
          {member.name}
        </div>
        <div class="column is-narrow">
          <label for={`level-${member.id}`} class="label is-small">Level:</label>
          <div class="control">
            <input
              id={`level-${member.id}`}
              type="number"
              min="1"
              class="input is-small"
              value={member.overrideLevel ?? member.level}
              oninput={(e) => handleLevelInput(e, member.id)}
              style="width: 5rem;"
            />
          </div>
        </div>
        <div class="column is-narrow">
          <button
            onclick={() => removeFromParty(member.id)}
            class="p-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Remove
          </button>
        </div>
      </div>
    {/each}
  </div>

  <!-- Live APL -->
  <div class="notification is-info is-light">
    <strong>Average Party Level (APL):</strong>
    {
      $encounterBuilderStore.currentParty.length
        ? calculateApl($encounterBuilderStore.currentParty).toFixed(2)
        : 'N/A'
    }
  </div>
</div>
