import { writable } from 'svelte/store';

import { STORAGE_KEYS } from '../../utils/constants.ts';

// Try to load from localStorage (only in browser)
let initialValue: string | null = null;
if (typeof localStorage !== 'undefined') {
  try {
    initialValue = localStorage.getItem(STORAGE_KEYS.SELECTED_HEX);
  } catch (e) {
    console.warn('Failed to load selectedHex from localStorage:', e);
  }
}

export const selectedHex = writable<string | null>(initialValue);

// Save on change
selectedHex.subscribe((value) => {
  if (typeof localStorage !== 'undefined') {
    try {
      if (value === null) {
        localStorage.removeItem(STORAGE_KEYS.SELECTED_HEX);
      } else {
        localStorage.setItem(STORAGE_KEYS.SELECTED_HEX, value);
      }
    } catch (e) {
      console.warn('Failed to save selectedHex to localStorage:', e);
    }
  }
});
