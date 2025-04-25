import { writable } from 'svelte/store';
import type { EncounterData, StatBlockData } from '../types.ts';

interface EncounterTunerState {
  characters: CharacterData[];
  encounters: EncounterData[];
  statBlocks: StatBlockData[];
  currentParty: { id: string; overrideLevel?: number }[];
  encounterMonsters: { id: string; quantity: number }[];
}

interface InitArgs {
  characters: CharacterData[];
  encounters: EncounterData[];
  statBlocks: StatBlockData[];
}

const defaultState: EncounterTunerState = {
  characters: [],
  encounters: [],
  statBlocks: [],
  currentParty: [],
  encounterMonsters: [],
};

function createEncounterBuilderStore() {
  const { subscribe, set, update } = writable<EncounterTunerState>(defaultState);

  return {
    subscribe,
    init: ({ characters, encounters, statBlocks }: InitArgs) =>
      set({ ...defaultState, characters, encounters, statBlocks }),
    // Add more actions later: addPartyMember, overrideLevel, addMonster, etc.
  };
}

export const encounterBuilderStore = createEncounterBuilderStore();
