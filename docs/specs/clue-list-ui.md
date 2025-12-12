Got it — simpler and cleaner. Here's the updated spec:

---

## Clue List UI/UX Improvement Spec

### Overview

Upgrade the clue list page to match the interactive filtering pattern established by the encounter list, while cleaning up the formatting and removing the redundant "All" page.

### Current State

**Index Page** (`/session-toolkit/clues/index.astro`)
- Static list rendering all clues via the `Clue.astro` component
- No filtering capability
- Links to the "all" page at the bottom
- Shows full `Clue` component for each item (verbose)

**All Page** (`/session-toolkit/clues/all.astro`)
- Shows all clues with `showDetail={true}`
- Redundant now that individual clue pages exist

**Clue Component** (`Clue.astro`)
- Handles both list item and detail views via `showDetail` prop
- Shows: name, status badge, factions, tags, summary, (optional) details, (optional) usedIn

### Target State

#### Phase 1: Create `ClueList.svelte` Component

**File:** `apps/web/src/components/ClueList.svelte`

Follows the `EncounterList.svelte` pattern with these filters:

| Filter | Type | Values |
|--------|------|--------|
| Search | Text input | Filters by name/summary |
| Status | Dropdown | All / Known / Unknown |
| Faction | Dropdown | All / (each faction) / No Faction |
| Plotline | Dropdown | All / (each plotline) |
| Tag | Dropdown | All / (each tag) |
| Usage | Dropdown | All / Used / Unused |

**Props:**
```typescript
interface ClueListItem {
  id: string;
  name: string;
  summary: string;
  status: 'known' | 'unknown';
  factions: string[];
  plotlines: string[];
  tags: string[];
  isUsed: boolean;      // Derived from usedIn array
}

interface Props {
  clues: ClueListItem[];
  filterOptions: {
    factions: string[];
    plotlines: string[];
    tags: string[];
  };
  plotlineNames: Record<string, string>;  // ID to display name mapping
}
```

**Display per clue:**
- Linked name (to `/session-toolkit/clues/{id}`) — always links, regardless of details
- Status badge **only for known clues** (green `[Known]`) — unknown clues show no badge
- Italic styling if unused (matches encounter pattern)

**Legend:**
```
Italic = unused | [Known] = discovered by players
```

**Filter count:**
```
Showing X of Y clues
```

#### Phase 2: Update Index Page

**File:** `apps/web/src/pages/session-toolkit/clues/index.astro`

Replace current implementation:

```astro
---
import { getCollection } from 'astro:content';
import type { EncounterData } from '@skyreach/schemas';

import ClueList from '../../../components/ClueList.svelte';
import SecretLayout from '../../../layouts/SecretLayout.astro';
import { buildClueUsageMap } from '../../../utils/clue-usage-tracker';

// Fetch clues and collections needed for usage tracking
const [cluesData, encounters, hexes, dungeons, pointcrawlNodes, plotlines] = await Promise.all([
  getCollection('clues'),
  getCollection('encounters'),
  getCollection('hexes'),
  getCollection('dungeons'),
  getCollection('pointcrawl-nodes'),
  getCollection('plotlines'),
]);

// Build encounter map for resolving keyed encounter references
const encounterMap = new Map<string, EncounterData>();
for (const encounter of encounters) {
  encounterMap.set(encounter.id, encounter.data);
}

// Build usage map
const usageMap = buildClueUsageMap(encounters, hexes, dungeons, pointcrawlNodes, encounterMap);

// Transform to list items
const clues = cluesData
  .map((c) => ({
    id: c.id,
    name: c.data.name,
    summary: c.data.summary,
    status: c.data.status,
    factions: c.data.factions ?? [],
    plotlines: c.data.plotlines ?? [],
    tags: c.data.tags ?? [],
    isUsed: (usageMap.get(c.id) ?? []).length > 0,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Extract unique filter options
const filterOptions = {
  factions: [...new Set(clues.flatMap((c) => c.factions))].sort(),
  plotlines: [...new Set(clues.flatMap((c) => c.plotlines))].sort(),
  tags: [...new Set(clues.flatMap((c) => c.tags))].sort(),
};

// Create plotline ID to name map for display
const plotlineNames = new Map(plotlines.map((p) => [p.id, p.data.name]));
---

<SecretLayout title="Clues">
  <ClueList
    client:load
    clues={clues}
    filterOptions={filterOptions}
    plotlineNames={Object.fromEntries(plotlineNames)}
  />
</SecretLayout>
```

#### Phase 3: Remove "All" Page

**Delete:** `apps/web/src/pages/session-toolkit/clues/all.astro`

**Update routes:** Check `routes.yml` and `sidebar.yml` for any references to the all page and remove them.

#### Phase 4: Review Detail Page and Component

**Files to review:**
- `apps/web/src/pages/session-toolkit/clues/[id].astro`
- `apps/web/src/components/Clue.astro`

The `Clue.astro` component is still used by the detail page. After this change, consider whether it can be simplified (e.g., removing list-mode props like `showName`) since `ClueList.svelte` now handles list rendering. This is a follow-up cleanup, not blocking.

---

### Implementation Order

1. Create `ClueList.svelte` component
2. Update index page to use the new component
3. Delete `all.astro`
4. Remove route references to the all page
5. (Optional) Review and simplify `Clue.astro` component

### Files Changed

| Action | File |
|--------|------|
| Create | `apps/web/src/components/ClueList.svelte` |
| Replace | `apps/web/src/pages/session-toolkit/clues/index.astro` |
| Delete | `apps/web/src/pages/session-toolkit/clues/all.astro` |
| Update | Route config files (if they reference the all page) |
| Review | `apps/web/src/components/Clue.astro` (optional cleanup) |

---

### Design Notes

**Why Svelte for the list component?**
- Matches established pattern from `EncounterList.svelte`
- Client-side filtering is snappy without page reloads
- Reactive filter state is cleaner in Svelte than vanilla JS

**Status badge logic:**
- Known clues: Show green `[Known]` badge
- Unknown clues: No badge (absence implies unknown)
- This reduces visual noise — most clues are unknown, so only the exceptions get marked

**Visual indicators:**
- Italic for unused clues (consistency with encounters)
- All clue names link to their detail page

---

Ready for Claude Code?
