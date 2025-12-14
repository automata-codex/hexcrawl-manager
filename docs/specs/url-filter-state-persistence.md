# URL Filter State Persistence

## Overview

Persist filter dropdown state in URL query parameters so that filter selections survive page refreshes and data changes during development. Each tab can maintain independent filter state.

## Current State

Four Svelte components have filter dropdowns using simple `$state()` variables:

| Component | Filters |
|-----------|---------|
| `EncounterList.svelte` | search, scope, location, faction, creature, usage, lead |
| `ClueList.svelte` | search, status, faction, plotline, tag, usage |
| `GmDashboard.svelte` | showCompleted (boolean), sessionFilter |
| `StatBlockList.svelte` | search, type |

All filter state resets on page refresh or when Astro hot-reloads due to data changes.

## Target State

Filter values sync bidirectionally with URL query parameters:
- On mount: initialize state from URL params (or defaults if absent)
- On change: update URL without triggering navigation
- Empty/default values: omit from URL to keep it clean

Example URLs:
```
/gm-reference/encounters?scope=dungeon&faction=goblins
/session-toolkit/clues?status=unknown&usage=unused
/gm-reference/stat-blocks?type=undead&search=zombie
```

---

## Implementation

### 1. Create Shared Utility

**File:** `apps/web/src/utils/url-filter-state.ts`

```typescript
import { browser } from '$app/environment';

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
```

**Note:** Svelte 5 in Astro doesn't have `$app/environment`. Use this browser check instead:

```typescript
const browser = typeof window !== 'undefined';
```

---

### 2. Update EncounterList.svelte

**File:** `apps/web/src/components/EncounterList.svelte`

**Parameter mapping:**

| State Variable | URL Param |
|----------------|-----------|
| `searchQuery` | `search` |
| `scopeFilter` | `scope` |
| `locationFilter` | `location` |
| `factionFilter` | `faction` |
| `creatureFilter` | `creature` |
| `usageFilter` | `usage` |
| `leadFilter` | `lead` |

**Changes:**

1. Import the utility:
```typescript
import { initFilterFromUrl, setUrlParam } from '../utils/url-filter-state';
```

2. Replace state initialization:
```typescript
// Before
let scopeFilter = $state('');

// After
let scopeFilter = $state(initFilterFromUrl('scope'));
```

3. Add effects to sync changes to URL:
```typescript
$effect(() => { setUrlParam('search', searchQuery); });
$effect(() => { setUrlParam('scope', scopeFilter); });
$effect(() => { setUrlParam('location', locationFilter); });
$effect(() => { setUrlParam('faction', factionFilter); });
$effect(() => { setUrlParam('creature', creatureFilter); });
$effect(() => { setUrlParam('usage', usageFilter); });
$effect(() => { setUrlParam('lead', leadFilter); });
```

4. Update `clearFilters()` to also clear URL:
```typescript
function clearFilters() {
  searchQuery = '';
  scopeFilter = '';
  locationFilter = '';
  factionFilter = '';
  creatureFilter = '';
  usageFilter = '';
  leadFilter = '';
  // URL params will be cleared by the $effect handlers
}
```

---

### 3. Update ClueList.svelte

**File:** `apps/web/src/components/ClueList.svelte`

**Parameter mapping:**

| State Variable | URL Param |
|----------------|-----------|
| `searchQuery` | `search` |
| `statusFilter` | `status` |
| `factionFilter` | `faction` |
| `plotlineFilter` | `plotline` |
| `tagFilter` | `tag` |
| `usageFilter` | `usage` |

**Changes:** Same pattern as EncounterList.

---

### 4. Update GmDashboard.svelte

**File:** `apps/web/src/components/GmDashboard.svelte`

**Parameter mapping:**

| State Variable | URL Param |
|----------------|-----------|
| `showCompleted` | `completed` |
| `sessionFilter` | `session` |

**Changes:**

1. Import utilities including boolean helpers:
```typescript
import {
  initFilterFromUrl,
  initBooleanFilterFromUrl,
  setUrlParam,
  setBooleanUrlParam
} from '../utils/url-filter-state';
```

2. Replace state initialization:
```typescript
// Before
let showCompleted = $state(false);
let sessionFilter = $state('');

// After
let showCompleted = $state(initBooleanFilterFromUrl('completed'));
let sessionFilter = $state(initFilterFromUrl('session'));
```

3. Add effects:
```typescript
$effect(() => { setBooleanUrlParam('completed', showCompleted); });
$effect(() => { setUrlParam('session', sessionFilter); });
```

---

### 5. Update StatBlockList.svelte

**File:** `apps/web/src/components/StatBlockList.svelte`

**Parameter mapping:**

| State Variable | URL Param |
|----------------|-----------|
| `search` | `search` |
| `typeFilter` | `type` |

**Changes:** Same pattern as others.

---

## Files Changed

| Action | File |
|--------|------|
| Create | `apps/web/src/utils/url-filter-state.ts` |
| Update | `apps/web/src/components/EncounterList.svelte` |
| Update | `apps/web/src/components/ClueList.svelte` |
| Update | `apps/web/src/components/GmDashboard.svelte` |
| Update | `apps/web/src/components/StatBlockList.svelte` |

---

## Edge Cases

**SSR Safety:** The utility must handle server-side rendering where `window` is undefined. All functions should no-op or return defaults when not in browser.

**Empty vs Missing:** Both empty string values and missing params should result in the filter showing "All" (the default). Don't distinguish between `?scope=` and no `scope` param.

**Special Characters:** URL encoding is handled automatically by `URLSearchParams`. Faction values like `cult-of-the-wyrm` work fine.

**Clear Button:** When `clearFilters()` is called, setting all state to `''` will trigger the effects, which will remove all params from the URL.

---

## Testing

Manual verification:

1. **Persistence:** Set filters → refresh page → filters should persist
2. **Independence:** Open two tabs with different filters → each maintains its own state
3. **Clean URLs:** Default/empty filters should not appear in URL
4. **Clear button:** Should reset both state and URL
5. **Direct navigation:** Pasting a URL with params should apply those filters
6. **Browser back/forward:** Should work naturally (though we use `replaceState`, so filter changes won't create history entries)

---

## Implementation Order

1. Create the utility file
2. Update EncounterList (most complex, proves the pattern)
3. Update remaining components
4. Manual testing across all pages
