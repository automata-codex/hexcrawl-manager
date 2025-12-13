const browser = typeof window !== 'undefined';

/**
 * Get a query parameter from the current URL.
 * Returns null if not present or if not in browser.
 */
export function getUrlParam(key: string): string | null {
  if (!browser) return null;
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

/**
 * Set a query parameter in the URL without navigation.
 * Removes the param if value is empty string or null.
 */
export function setUrlParam(key: string, value: string | null): void {
  if (!browser) return;

  const url = new URL(window.location.href);

  if (value === null || value === '') {
    url.searchParams.delete(key);
  } else {
    url.searchParams.set(key, value);
  }

  // Update URL without triggering navigation or adding history entry
  window.history.replaceState({}, '', url.toString());
}

/**
 * Initialize a filter value from URL, with a default fallback.
 */
export function initFilterFromUrl(key: string, defaultValue: string = ''): string {
  return getUrlParam(key) ?? defaultValue;
}

/**
 * For boolean filters stored as 'true'/'false' strings.
 */
export function initBooleanFilterFromUrl(key: string, defaultValue: boolean = false): boolean {
  const param = getUrlParam(key);
  if (param === null) return defaultValue;
  return param === 'true';
}

export function setBooleanUrlParam(key: string, value: boolean, defaultValue: boolean = false): void {
  // Only include in URL if different from default
  if (value === defaultValue) {
    setUrlParam(key, null);
  } else {
    setUrlParam(key, String(value));
  }
}
