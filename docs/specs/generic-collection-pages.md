# Generic Collection Pages Specification

## Overview

This specification describes a system for automatically generating collection index, detail, and "all" pages using a catch-all route with a component registry. The goal is to reduce boilerplate when adding new collections - instead of creating three page files per collection, developers only need to:

1. Define the schema in `@skyreach/schemas`
2. Add the collection to `content.config.ts`
3. Add routes to `routes.yml` and `sidebar.yml`
4. Create the detail component (Astro or Svelte)

Specific page implementations can override the generic behavior when needed.

---

## Current State

### Page Structure Per Collection

Each collection currently has up to 3 Astro page files:

```
apps/web/src/pages/gm-reference/characters/
├── index.astro    # List view (paginated or full)
├── [id].astro     # Detail view
└── all.astro      # All items on one page (optional)
```

### Pattern Analysis

**High consistency (good genericization candidates):**
- Detail pages (`[id].astro`): ~80% identical structure
- All pages (`all.astro`): ~90% identical structure

**Moderate consistency:**
- Index pages: Same basic structure but varying sort functions, summary vs link rendering

**Low consistency (need custom implementations):**
- Pages with cross-references (encounters load stat blocks, clues, roleplay books)
- Pages with client-side filtering (encounters, stat blocks use Svelte components)
- Pages with complex sorting (regions use `regionSort()`, hexes use `hexSort()`)

### Current Collections

| Collection | Has Custom Index | Has Custom Detail | Has All Page | Notes |
|------------|------------------|-------------------|--------------|-------|
| characters | Yes | Yes | No | 2-column layout |
| dungeons | Yes | Yes | No | Custom sorting, nested details |
| encounters | Yes | Yes | No | Augmented data, Svelte filtering |
| clues | Yes | Yes | No | Standard pattern |
| hexes | Yes | Yes | No | Custom hex sorting |
| lootPacks | Yes | Yes | Yes | Summary components |
| npcs | Yes | Yes | No | Standard pattern |
| pointcrawls | Yes | Yes | No | Map visualization |
| regions | Yes | Yes | Yes | Custom sorting |
| roleplayBooks | Yes | Yes | No | Standard pattern |
| rumors | Yes | Yes | Yes | Standard pattern |
| statBlocks | Yes | Yes | No | Grouping, Svelte filtering |

---

## Target State

### Generic Page Handling

The `[...slug].astro` catch-all route handles collection pages when no specific page file exists:

```
URL: /gm-reference/spells
  → Check: Does apps/web/src/pages/gm-reference/spells/index.astro exist?
  → No: Use generic index template with registry config

URL: /gm-reference/spells/fireball
  → Check: Does apps/web/src/pages/gm-reference/spells/[id].astro exist?
  → No: Use generic detail template with registry config

URL: /gm-reference/spells/all
  → Check: Does apps/web/src/pages/gm-reference/spells/all.astro exist?
  → No: Use generic all template with registry config
```

### Collection Registry

A central registry maps collection names to their configuration:

```typescript
// apps/web/src/config/collection-registry.ts

import type { ComponentType } from 'astro';
import SpellDetails from '@/components/collections/SpellDetails.astro';
import CharacterDetails from '@/components/collections/CharacterDetails.astro';
// ... other imports

export interface CollectionConfig {
  // Required
  collection: string;           // Astro content collection name
  detailComponent: ComponentType; // Component to render item details

  // Layout
  layout: 'component' | 'secret' | 'secret-article';

  // Index page config
  indexTitle: string;
  sortBy?: 'name' | 'displayName' | 'title' | ((a: any, b: any) => number);
  indexMode?: 'links' | 'summaries' | 'details'; // Default: 'links'
  summaryComponent?: ComponentType; // Required if indexMode is 'summaries'

  // Title extraction
  getTitle?: (item: any) => string; // Default: item.name || item.title

  // Optional "all" page
  hasAllPage?: boolean;
  allPageTitle?: string;
}

export const collectionRegistry: Record<string, CollectionConfig> = {
  spells: {
    collection: 'spells',
    detailComponent: SpellDetails,
    layout: 'secret',
    indexTitle: 'Spells',
    sortBy: 'name',
    indexMode: 'links',
    hasAllPage: true,
    allPageTitle: 'All Spells',
  },

  // Collections that use generic handling
  npcs: {
    collection: 'npcs',
    detailComponent: NpcDetails,
    layout: 'secret',
    indexTitle: 'NPCs',
    sortBy: 'displayName',
    getTitle: (item) => item.displayName,
  },

  // Collections with custom pages don't need full config,
  // but can be listed for documentation
  encounters: {
    collection: 'encounters',
    detailComponent: null!, // Uses custom page
    layout: 'secret',
    indexTitle: 'Encounters',
    _customPages: ['index', 'detail'], // Documentation only
  },
};
```

### Route Matching

The registry integrates with `routes.yml` to determine which URLs map to which collections:

```yaml
# data/routes.yml (existing structure)
gmReference:
  spells:
    type: collection
    path: /gm-reference/spells
    idPath: /gm-reference/spells/[id]
    allPath: /gm-reference/spells/all  # Optional
```

The catch-all route uses these paths to:
1. Match incoming URLs to collections
2. Extract the item ID from `idPath` patterns
3. Determine if the URL is for index, detail, or all page

---

## Implementation Requirements

### 1. Collection Registry

Create `apps/web/src/config/collection-registry.ts`:

```typescript
import type { AstroComponentFactory } from 'astro/runtime/server/render/index.js';

export type LayoutType = 'component' | 'secret' | 'secret-article';
export type IndexMode = 'links' | 'summaries' | 'details';
export type SortOption = 'name' | 'displayName' | 'title' | ((a: any, b: any) => number);

export interface CollectionConfig {
  /** Astro content collection name (must match content.config.ts) */
  collection: string;

  /** Component to render item details */
  detailComponent: AstroComponentFactory;

  /** Layout wrapper to use */
  layout: LayoutType;

  /** Title for index page */
  indexTitle: string;

  /** How to sort items. String = property name, function = custom comparator */
  sortBy?: SortOption;

  /** How to render items on index page */
  indexMode?: IndexMode;

  /** Component for summary rendering (required if indexMode is 'summaries') */
  summaryComponent?: AstroComponentFactory;

  /** Extract display title from item */
  getTitle?: (item: any) => string;

  /** Extract ID for URL generation */
  getId?: (item: any) => string;

  /** Whether this collection has an "all" page */
  hasAllPage?: boolean;

  /** Title for "all" page */
  allPageTitle?: string;
}

// Default title extractor
export const defaultGetTitle = (item: any): string =>
  item.name || item.displayName || item.title || item.id;

// Default ID extractor
export const defaultGetId = (item: any): string => item.id;

// Sort function factory
export function createSortFunction(sortBy: SortOption): (a: any, b: any) => number {
  if (typeof sortBy === 'function') {
    return sortBy;
  }
  return (a, b) => {
    const aVal = a.data?.[sortBy] ?? a[sortBy] ?? '';
    const bVal = b.data?.[sortBy] ?? b[sortBy] ?? '';
    return String(aVal).localeCompare(String(bVal));
  };
}
```

### 2. Route Resolver

Create `apps/web/src/utils/collection-route-resolver.ts`:

```typescript
import { ROUTES, type CollectionRoute } from '@/config/routes';
import { collectionRegistry, type CollectionConfig } from '@/config/collection-registry';

export interface ResolvedCollectionRoute {
  collectionKey: string;
  config: CollectionConfig;
  route: CollectionRoute;
  pageType: 'index' | 'detail' | 'all';
  itemId?: string; // Present for detail pages
}

/**
 * Attempt to resolve a URL path to a collection route.
 * Returns null if the path doesn't match any collection.
 */
export function resolveCollectionRoute(pathname: string): ResolvedCollectionRoute | null {
  // Normalize pathname
  const normalizedPath = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;

  // Search all routes for collection matches
  for (const [key, config] of Object.entries(collectionRegistry)) {
    const route = findCollectionRoute(key);
    if (!route) continue;

    // Check "all" page first (most specific)
    if (route.allPath && normalizedPath === route.allPath) {
      return { collectionKey: key, config, route, pageType: 'all' };
    }

    // Check detail page (has [id] parameter)
    const idMatch = matchIdPath(normalizedPath, route.idPath);
    if (idMatch) {
      return { collectionKey: key, config, route, pageType: 'detail', itemId: idMatch };
    }

    // Check index page
    if (normalizedPath === route.path) {
      return { collectionKey: key, config, route, pageType: 'index' };
    }
  }

  return null;
}

/**
 * Match a path against an idPath pattern like "/gm-reference/spells/[id]"
 * Returns the extracted ID or null if no match.
 */
function matchIdPath(pathname: string, idPath: string): string | null {
  // Convert "/gm-reference/spells/[id]" to regex
  const pattern = idPath.replace('[id]', '([^/]+)');
  const regex = new RegExp(`^${pattern}$`);
  const match = pathname.match(regex);
  return match ? match[1] : null;
}

/**
 * Find the collection route config from ROUTES by registry key.
 * This traverses the nested ROUTES object to find the matching collection.
 */
function findCollectionRoute(registryKey: string): CollectionRoute | null {
  // Implementation depends on how registry keys map to ROUTES structure
  // Could be a direct lookup table or a traversal
  // ...
}
```

### 3. Generic Page Templates

Create reusable template components:

#### Generic Index Template

```astro
---
// apps/web/src/components/generic/GenericCollectionIndex.astro
import { getCollection } from 'astro:content';
import ComponentLayout from '@/layouts/ComponentLayout.astro';
import SecretLayout from '@/layouts/SecretLayout.astro';
import type { CollectionConfig } from '@/config/collection-registry';
import { createSortFunction, defaultGetTitle, defaultGetId } from '@/config/collection-registry';
import { getCollectionItemPath } from '@/config/routes';

interface Props {
  config: CollectionConfig;
  routeKey: string; // For generating item URLs
}

const { config, routeKey } = Astro.props;

const items = await getCollection(config.collection);
const sortFn = createSortFunction(config.sortBy ?? 'name');
const sorted = [...items].sort((a, b) => sortFn(a.data, b.data));

const getTitle = config.getTitle ?? defaultGetTitle;
const getId = config.getId ?? defaultGetId;
const Layout = config.layout === 'secret' ? SecretLayout : ComponentLayout;
---

<Layout title={config.indexTitle}>
  <h1>{config.indexTitle}</h1>

  {config.indexMode === 'links' && (
    <ul>
      {sorted.map((item) => (
        <li>
          <a href={getCollectionItemPath(routeKey, getId(item.data))}>
            {getTitle(item.data)}
          </a>
        </li>
      ))}
    </ul>
  )}

  {config.indexMode === 'summaries' && config.summaryComponent && (
    sorted.map((item) => (
      <config.summaryComponent item={item.data} />
    ))
  )}

  {config.indexMode === 'details' && (
    sorted.map((item) => (
      <config.detailComponent item={item.data} />
    ))
  )}

  {config.hasAllPage && (
    <p><a href={`${Astro.url.pathname}/all`}>View all on one page</a></p>
  )}
</Layout>
```

#### Generic Detail Template

```astro
---
// apps/web/src/components/generic/GenericCollectionDetail.astro
import { getEntry } from 'astro:content';
import ComponentLayout from '@/layouts/ComponentLayout.astro';
import SecretLayout from '@/layouts/SecretLayout.astro';
import type { CollectionConfig } from '@/config/collection-registry';
import { defaultGetTitle } from '@/config/collection-registry';

interface Props {
  config: CollectionConfig;
  itemId: string;
}

const { config, itemId } = Astro.props;

const entry = await getEntry(config.collection, itemId);
if (!entry) {
  return new Response(null, { status: 404, statusText: 'Not Found' });
}

const getTitle = config.getTitle ?? defaultGetTitle;
const Layout = config.layout === 'secret' ? SecretLayout : ComponentLayout;
const DetailComponent = config.detailComponent;
---

<Layout title={getTitle(entry.data)}>
  <DetailComponent item={entry.data} />
</Layout>
```

#### Generic All Template

```astro
---
// apps/web/src/components/generic/GenericCollectionAll.astro
import { getCollection } from 'astro:content';
import ComponentLayout from '@/layouts/ComponentLayout.astro';
import SecretLayout from '@/layouts/SecretLayout.astro';
import type { CollectionConfig } from '@/config/collection-registry';
import { createSortFunction, defaultGetTitle } from '@/config/collection-registry';

interface Props {
  config: CollectionConfig;
}

const { config } = Astro.props;

const items = await getCollection(config.collection);
const sortFn = createSortFunction(config.sortBy ?? 'name');
const sorted = [...items].sort((a, b) => sortFn(a.data, b.data));

const getTitle = config.getTitle ?? defaultGetTitle;
const Layout = config.layout === 'secret' ? SecretLayout : ComponentLayout;
const DetailComponent = config.detailComponent;
---

<Layout title={config.allPageTitle ?? `All ${config.indexTitle}`}>
  <h1>{config.allPageTitle ?? `All ${config.indexTitle}`}</h1>

  {sorted.map((item) => (
    <section>
      <h2>{getTitle(item.data)}</h2>
      <DetailComponent item={item.data} />
    </section>
  ))}
</Layout>
```

### 4. Enhanced Catch-All Route

Update `apps/web/src/pages/[...slug].astro`:

```astro
---
import { resolveCollectionRoute } from '@/utils/collection-route-resolver';
import GenericCollectionIndex from '@/components/generic/GenericCollectionIndex.astro';
import GenericCollectionDetail from '@/components/generic/GenericCollectionDetail.astro';
import GenericCollectionAll from '@/components/generic/GenericCollectionAll.astro';

// ... existing article resolution logic ...

const pathname = Astro.url.pathname;

// Try to resolve as collection route
const collectionMatch = resolveCollectionRoute(pathname);

if (collectionMatch) {
  const { config, pageType, itemId, collectionKey } = collectionMatch;

  // Render appropriate template based on page type
  if (pageType === 'index') {
    return Astro.redirect(''); // Astro handles component rendering differently
  }
  // ... handle detail and all pages
}

// ... existing article/composite resolution logic ...

// 404 if nothing matched
return new Response(null, { status: 404 });
---

{/* Conditional rendering based on what was matched */}
{collectionMatch?.pageType === 'index' && (
  <GenericCollectionIndex config={collectionMatch.config} routeKey={collectionMatch.collectionKey} />
)}

{collectionMatch?.pageType === 'detail' && collectionMatch.itemId && (
  <GenericCollectionDetail config={collectionMatch.config} itemId={collectionMatch.itemId} />
)}

{collectionMatch?.pageType === 'all' && (
  <GenericCollectionAll config={collectionMatch.config} />
)}
```

### 5. Specific Page Override

Astro's file-based routing automatically handles precedence:

```
/gm-reference/spells/fireball
  1. Check: apps/web/src/pages/gm-reference/spells/[id].astro → NOT FOUND
  2. Check: apps/web/src/pages/[...slug].astro → FOUND, use catch-all

/gm-reference/encounters/goblin-ambush
  1. Check: apps/web/src/pages/gm-reference/encounters/[id].astro → FOUND, use specific
  2. (catch-all never reached)
```

No special logic needed - specific pages automatically take precedence.

---

## Adding a New Collection

### Minimal Steps (Generic Handling)

1. **Define schema** in `packages/schemas/src/schemas/`:
   ```typescript
   // spell.ts
   export const SpellSchema = z.object({ ... });
   ```

2. **Add to content.config.ts**:
   ```typescript
   spells: defineCollection({
     loader: glob({ pattern: '**/*.{yaml,yml}', base: 'data/spells' }),
     schema: SpellSchema,
   }),
   ```

3. **Add routes** to `data/routes.yml`:
   ```yaml
   gmReference:
     spells:
       type: collection
       path: /gm-reference/spells
       idPath: /gm-reference/spells/[id]
       allPath: /gm-reference/spells/all
   ```

4. **Add to sidebar** in `data/sidebar.yml`:
   ```yaml
   - label: Spells
     href:
       type: collection
       path: spells
   ```

5. **Create detail component**:
   ```astro
   // apps/web/src/components/collections/SpellDetails.astro
   ---
   import type { SpellData } from '@skyreach/schemas';
   interface Props { item: SpellData; }
   const { item } = Astro.props;
   ---
   <article>
     <h1>{item.name}</h1>
     <p><strong>Level:</strong> {item.level}</p>
     <!-- ... -->
   </article>
   ```

6. **Register in collection registry**:
   ```typescript
   spells: {
     collection: 'spells',
     detailComponent: SpellDetails,
     layout: 'secret',
     indexTitle: 'Spells',
     sortBy: 'name',
     hasAllPage: true,
   },
   ```

### Custom Page Override

If a collection needs special handling, create the specific page file:

```astro
// apps/web/src/pages/gm-reference/spells/[id].astro
---
// Custom logic here - this overrides the generic handler
import { getEntry, getCollection } from 'astro:content';
import SpellDetails from '@/components/collections/SpellDetails.astro';

const { id } = Astro.params;
const spell = await getEntry('spells', id!);

// Custom: Load related spells
const allSpells = await getCollection('spells');
const relatedSpells = allSpells.filter(s =>
  spell?.data.relatedSpells?.includes(s.data.id)
);
---
<SecretLayout title={spell.data.name}>
  <SpellDetails item={spell.data} relatedSpells={relatedSpells} />
</SecretLayout>
```

---

## Migration Path

### Phase 1: Infrastructure

1. Create collection registry module
2. Create route resolver utility
3. Create generic template components
4. Update catch-all route to check registry

### Phase 2: Opt-In New Collections

1. New collections (e.g., spells) use generic handling from the start
2. Validate pattern works correctly

### Phase 3: Migrate Existing Collections (Optional)

Collections with simple patterns can be migrated:

1. **Good candidates** (standard patterns):
   - `clues` - standard index/detail
   - `lootPacks` - uses summary component (test summaryComponent support)
   - `rumors` - standard pattern
   - `roleplayBooks` - standard pattern
   - `npcs` - standard pattern

2. **Keep custom** (complex requirements):
   - `encounters` - augmented data, client-side filtering
   - `statBlocks` - grouping logic, client-side filtering
   - `dungeons` - nested structure, custom sorting
   - `hexes` - hex sorting, map integration
   - `regions` - custom sorting, cross-references
   - `characters` - 2-column layout
   - `knowledgeTrees` - tree visualization
   - `pointcrawls` - map visualization

### Phase 4: Cleanup

1. Delete migrated page files
2. Update registry to mark collections as `_customPages: false`
3. Document which collections use generic vs custom pages

---

## Success Criteria

- [ ] Collection registry exists with type-safe configuration
- [ ] Route resolver correctly matches URLs to collections
- [ ] Generic index template renders collection lists
- [ ] Generic detail template renders individual items
- [ ] Generic all template renders all items on one page
- [ ] Specific page files override generic handling automatically
- [ ] New spells collection works with only registry + detail component
- [ ] At least one existing collection migrated to generic handling
- [ ] Documentation updated with "Adding a Collection" guide

---

## Future Enhancements

### Pagination Support

Add pagination config to registry:

```typescript
pagination?: {
  enabled: boolean;
  pageSize: number;
};
```

### Search/Filter Support

Add client-side filtering option:

```typescript
filtering?: {
  enabled: boolean;
  filterComponent: SvelteComponent; // e.g., SpellFilter.svelte
  filterFields: string[]; // Fields to expose for filtering
};
```

### Grouped Index Pages

Support grouping items on index page:

```typescript
grouping?: {
  enabled: boolean;
  groupBy: string; // Property to group by
  groupLabels?: Record<string, string>; // Optional display labels
};
```

---

## Notes

- This spec assumes Astro's file-based routing precedence works as documented
- The catch-all route approach means all detail components must be imported into the registry (increases bundle awareness but Astro tree-shakes unused components)
- Consider lazy-loading detail components if the registry grows large
- The registry could be generated from `routes.yml` if we add component metadata there, but keeping them separate provides flexibility
