import { writable } from 'svelte/store';

import { STORAGE_KEYS } from '../utils/constants.ts';

import type { CharacterData, EncounterData, StatBlockData } from '../types.ts';

export interface CurrentPartyMember {
  id: string;
  name: string;
  level: number;
  overrideLevel?: number;
}

interface EncounterBuilderState {
  characters: CharacterData[];
  currentParty: CurrentPartyMember[];
  encounterMonsters: { id: string; quantity: number }[];
  encounters: EncounterData[];
  loaded: boolean;
  statBlocks: StatBlockData[];
}

type EncounterBuilderSaveData = Pick<
  EncounterBuilderState,
  'currentParty' | 'encounterMonsters'
>;

interface InitArgs {
  characters: CharacterData[];
  encounters: EncounterData[];
  statBlocks: StatBlockData[];
}

const defaultState: EncounterBuilderState = {
  characters: [],
  currentParty: [],
  encounterMonsters: [],
  encounters: [],
  loaded: false,
  statBlocks: [],
};

function createEncounterBuilderStore() {
  const saved = loadFromLocalStorage();
  const initialState: EncounterBuilderState = {
    ...defaultState,
    ...saved,
  };
  const { subscribe, update } = writable<EncounterBuilderState>(initialState);

  subscribe((state) => {
    saveToLocalStorage(state);
  });

  function loadFromLocalStorage(): EncounterBuilderState | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ENCOUNTER_BUILDER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveToLocalStorage(state: EncounterBuilderState) {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const data: EncounterBuilderSaveData = {
      currentParty: state.currentParty,
      encounterMonsters: state.encounterMonsters,
    };
    localStorage.setItem(STORAGE_KEYS.ENCOUNTER_BUILDER, JSON.stringify(data));
  }

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

    addMonsterToEncounter(monsterId: string) {
      update((state) => {
        const monster = state.statBlocks.find((m) => m.id === monsterId);
        if (!monster) {
          return state;
        }

        const alreadyInEncounter = state.encounterMonsters.find(
          (em) => em.id === monsterId,
        );
        if (alreadyInEncounter) {
          // If monster already added, maybe increase quantity later, but for now just ignore
          return state;
        }

        return {
          ...state,
          encounterMonsters: [
            ...state.encounterMonsters,
            { id: monsterId, quantity: 1 },
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
      update((state) => ({
        ...state,
        characters,
        encounters,
        loaded: true,
        statBlocks,
      })),

    removeFromParty(id: string) {
      update((state) => ({
        ...state,
        currentParty: state.currentParty.filter((c) => c.id !== id),
      }));
    },

    removeMonsterFromEncounter(monsterId: string) {
      update((state) => ({
        ...state,
        encounterMonsters: state.encounterMonsters.filter(
          (em) => em.id !== monsterId,
        ),
      }));
    },

    setMonsterQuantity(monsterId: string, newQuantity: number) {
      update((state) => ({
        ...state,
        encounterMonsters: state.encounterMonsters.map((em) =>
          em.id === monsterId ? { ...em, quantity: newQuantity } : em,
        ),
      }));
    },

    setOverrideLevel(id: string, level: number) {
      update((state) => ({
        ...state,
        currentParty: state.currentParty.map((c) =>
          c.id === id ? { ...c, overrideLevel: level } : c,
        ),
      }));
    },
  };
}

export const encounterBuilderStore = createEncounterBuilderStore();
