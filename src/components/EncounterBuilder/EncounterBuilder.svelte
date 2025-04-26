<script lang="ts">
  import MonsterSelector from './MonsterSelector.svelte';

  // We will fill these in later
  // import EncounterList from './EncounterList.svelte';
  // import XpCalculator from './XpCalculator.svelte';
</script>

<div>
  <h2 class="title is-3">Encounter Builder</h2>

  <!-- Monster Selector -->
  <div class="box">
    <h3 class="subtitle is-5">Add Monsters to Encounter</h3>
    <MonsterSelector />
  </div>

  <!-- Current Encounter List -->
  <div class="box">
    <h3 class="subtitle is-5">Encounter Composition</h3>
    <!-- <EncounterList /> -->
    <p class="has-text-grey">Encounter list coming soon...</p>
  </div>

  <!-- XP Calculation and Difficulty -->
  <div class="notification is-light">
    <h3 class="subtitle is-5">Encounter Difficulty</h3>
    <!-- <XpCalculator /> -->
    <p class="has-text-grey">XP scaling and thresholds coming soon...</p>
  </div>
</div>
