<script lang="ts">
  import { encounterBuilderStore } from '../../stores/encounter-builder.ts';

  import EncounterBuilder from './EncounterBuilder.svelte';
  import PartyBuilder from './PartyBuilder.svelte';

  import type { CharacterData, EncounterData, StatBlockData } from '../../types.ts';

  interface Props {
    characters: CharacterData[];
    encounters: EncounterData[];
    statBlocks: StatBlockData[];
  }

  const { characters, encounters, statBlocks }: Props = $props();

  // Initialize store with data
  encounterBuilderStore.init({ characters, encounters, statBlocks });
</script>

<div class="content">
  {#if $encounterBuilderStore.loaded}
    <PartyBuilder />
    <EncounterBuilder />
  {:else}
    <div class="has-text-grey">Loading...</div>
  {/if}
</div>
