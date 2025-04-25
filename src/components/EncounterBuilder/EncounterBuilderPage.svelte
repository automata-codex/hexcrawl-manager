<script lang="ts">
  import type { EncounterData, StatBlockData } from '../../types.ts';
  import { encounterBuilderStore } from '../../stores/encounter-builder.ts';
  import PartyBuilder from './PartyBuilder.svelte';
  import EncounterBuilder from './EncounterBuilder.svelte';

  interface Props {
    characters: CharacterData[];
    encounters: EncounterData[];
    statBlocks: StatBlockData[];
  }

  const { characters, encounters, statBlocks }: Props = $props();

  // Initialize store with data
  encounterBuilderStore.init({ characters, encounters, statBlocks });
</script>

<div class="flex flex-col gap-8 p-4">
  <PartyBuilder />
  <EncounterBuilder />
</div>
