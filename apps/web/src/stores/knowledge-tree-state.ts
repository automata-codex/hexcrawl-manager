import { writable, get } from 'svelte/store';

import { STORAGE_KEYS } from '../utils/constants.ts';

type ExpandedState = Record<string, boolean>;

const SAVE_DEBOUNCE_MS = 300;

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function loadInitialState(): ExpandedState {
  if (typeof localStorage === 'undefined') return {};

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.KNOWLEDGE_TREE_EXPANDED);
    if (!raw) return {};
    return JSON.parse(raw) as ExpandedState;
  } catch {
    return {};
  }
}

function saveState(state: ExpandedState): void {
  if (typeof localStorage === 'undefined') return;

  // Debounce saves to avoid thrashing localStorage
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.KNOWLEDGE_TREE_EXPANDED,
        JSON.stringify(state),
      );
    } catch {
      // Storage full or unavailable - ignore
    }
  }, SAVE_DEBOUNCE_MS);
}

export const knowledgeTreeExpanded = writable<ExpandedState>(loadInitialState());

// Save on every change (debounced)
knowledgeTreeExpanded.subscribe(saveState);

/**
 * Check if a node is expanded. Defaults to true if not explicitly set.
 */
export function isNodeExpanded(fullId: string): boolean {
  const state = get(knowledgeTreeExpanded);
  return state[fullId] ?? true;
}

/**
 * Toggle a node's expanded state.
 */
export function toggleNodeExpanded(fullId: string): void {
  knowledgeTreeExpanded.update((state) => ({
    ...state,
    [fullId]: !(state[fullId] ?? true),
  }));
}

/**
 * Set a node's expanded state explicitly.
 */
export function setNodeExpanded(fullId: string, expanded: boolean): void {
  knowledgeTreeExpanded.update((state) => ({
    ...state,
    [fullId]: expanded,
  }));
}
