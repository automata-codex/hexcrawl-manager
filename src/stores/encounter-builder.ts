import { writable } from 'svelte/store';
import type { CharacterData, EncounterData, StatBlockData } from '../types.ts';

export interface CurrentPartyMember {
  id: string;
  name: string;
  level: number;
  overrideLevel?: number;
}

interface EncounterTunerState {
  characters: CharacterData[];
  encounters: EncounterData[];
  statBlocks: StatBlockData[];
  currentParty: CurrentPartyMember[];
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

    addCustomCharacter(name: string, level: number) {
      update((state) => {
        const id = `custom-${crypto.randomUUID()}`;
        return {
          ...state,
          currentParty: [
            ...state.currentParty,
            {
              id,
              name,
              level,
              overrideLevel: undefined,
            },
          ],
        };
      });
    },

    addToParty(id: string) {
      update((state) => {
        const character = state.characters.find((c) => c.id === id);
        if (!character) {
          return state;
        }
        // Prevent duplicates
        if (state.currentParty.some((c) => c.id === id)) {
          return state;
        }
        return {
          ...state,
          currentParty: [
            ...state.currentParty,
            {
              id: character.id,
              name: character.displayName,
              level: character.level,
              overrideLevel: undefined,
            },
          ],
        };
      });
    },

    init: ({ characters, encounters, statBlocks }: InitArgs) =>
      set({ ...defaultState, characters, encounters, statBlocks }),

    removeFromParty(id: string) {
      update((state) => ({
        ...state,
        currentParty: state.currentParty.filter((c) => c.id !== id),
      }));
    },

    setOverrideLevel(id: string, level: number) {
      update((state) => ({
        ...state,
        currentParty: state.currentParty.map((c) => c.id === id ? { ...c, overrideLevel: level } : c),
      }));
    },
  };
}

export const encounterBuilderStore = createEncounterBuilderStore();
