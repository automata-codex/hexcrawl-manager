import { writable } from 'svelte/store';

import { STORAGE_KEYS } from '../utils/constants.ts';

type BooleanState = Record<string, boolean>;

const SAVE_DEBOUNCE_MS = 300;

/**
 * Create a persisted boolean state store with debounced localStorage saves.
 */
function createPersistedBooleanStore(storageKey: string, defaultValue: boolean) {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  function loadInitialState(): BooleanState {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return {};
      return JSON.parse(raw) as BooleanState;
    } catch {
      return {};
    }
  }

  function saveState(state: BooleanState): void {
    if (typeof localStorage === 'undefined') return;
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // Storage full or unavailable - ignore
      }
    }, SAVE_DEBOUNCE_MS);
  }

  const store = writable<BooleanState>(loadInitialState());
  store.subscribe(saveState);

  function toggle(id: string): void {
    store.update((state) => ({
      ...state,
      [id]: !(state[id] ?? defaultValue),
    }));
  }

  return { store, toggle, defaultValue };
}

// Node children expanded state (defaults to expanded)
const expanded = createPersistedBooleanStore(
  STORAGE_KEYS.KNOWLEDGE_TREE_EXPANDED,
  true,
);
export const knowledgeTreeExpanded = expanded.store;
export const toggleNodeExpanded = expanded.toggle;

// Details section expanded state (defaults to collapsed)
const details = createPersistedBooleanStore(
  STORAGE_KEYS.KNOWLEDGE_TREE_DETAILS,
  false,
);
export const knowledgeTreeDetails = details.store;
export const toggleNodeDetails = details.toggle;
