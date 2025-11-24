import { writable } from 'svelte/store';

import { STORAGE_KEYS } from '../utils/constants.ts';

export type ThemePreference = 'light' | 'system' | 'dark';

const defaultTheme: ThemePreference = 'system';

function loadInitialTheme(): ThemePreference {
  if (typeof localStorage === 'undefined') return defaultTheme;

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE);
    if (!raw) return defaultTheme;

    const parsed = raw as ThemePreference;
    if (parsed === 'light' || parsed === 'system' || parsed === 'dark') {
      return parsed;
    }
    return defaultTheme;
  } catch (e) {
    console.warn('Failed to load theme preference from localStorage:', e);
    return defaultTheme;
  }
}

function applyThemeToDocument(preference: ThemePreference): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;

  if (preference === 'light') {
    html.setAttribute('data-theme', 'light');
  } else if (preference === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else {
    // 'system' - remove attribute to let Bulma use prefers-color-scheme
    html.removeAttribute('data-theme');
  }
}

export const themePreference = writable<ThemePreference>(loadInitialTheme());

themePreference.subscribe((value) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, value);
    } catch (e) {
      console.warn('Failed to save theme preference to localStorage:', e);
    }
  }
  applyThemeToDocument(value);
});

export function cycleTheme(): void {
  themePreference.update((current) => {
    if (current === 'light') return 'system';
    if (current === 'system') return 'dark';
    return 'light';
  });
}
