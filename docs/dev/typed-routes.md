# Typed Routes System

This document explains how URL routing works in the web app, including the typed route configuration and path resolution.

## Overview

Routes are defined in YAML and generated to TypeScript at build time. This gives us:

- **Single source of truth** for all URL paths
- **Type-safe path helpers** that prevent typos and broken links
- **Validation** that routes reference valid content

## Data Flow

```
data/routes.yml
      ↓
scripts/generate-config.ts (build time)
      ↓
src/config/generated/routes.ts
      ↓
src/utils/article-paths.ts (server-side resolution)
      ↓
Actual URLs in components
```

## Route Types

### Direct String Routes

A simple path to a page. Used for standalone pages that don't reference content by ID.

```yaml
interactiveMap: /players-reference/interactive-map
schemas: /gm-reference/schemas
```

### Index Routes (with nesting)

When a route has both its own page AND nested child routes, use `index` for the parent's path:

```yaml
winter1512:
  index: /gm-reference/winter-1512    # The parent page
  playersGuide:                        # Nested child route
    type: article
    id: winter-1512/players-guide
  npcRoster:                           # Another child
    type: article
    id: winter-1512/npc-roster
```

The `index` key is needed because the parent is an object (to hold children), so we can't use a direct string.

### Typed Routes

There are three kinds of typed routes:

#### Article Routes

Reference a markdown article by its frontmatter `id`.

```yaml
advancement:
  type: article
  id: advancement
```

The article's actual URL comes from its `slug` field in frontmatter. This indirection means you can reorganize URL structure without updating every reference.

#### Composite Routes

Reference a composite article (multiple articles assembled into one page).

```yaml
houseRules:
  type: composite
  id: house-rules
```

Composites are defined in `data/composite-articles/` and have their own `slug` field.

#### Collection Routes

Reference a collection of items (dungeons, hexes, encounters, etc.).

```yaml
dungeons:
  type: collection
  path: /gm-reference/dungeons
  idPath: /gm-reference/dungeons/[id]
  allPath: /gm-reference/dungeons/all
```

Collection routes have:

- **`path`** - The collection's index/landing page
- **`idPath`** - Individual item pages (`[id]` is replaced with the item ID)
- **`allPath`** (optional) - A single page showing *all* items from the collection combined (useful for exporting or feeding to LLMs)

**Important:** These paths must have corresponding Astro pages in `src/pages/`. The routes.yml is just configuration - it doesn't generate pages automatically. You need:

- A page at the `path` location (e.g., `src/pages/gm-reference/dungeons/index.astro`)
- A dynamic page for `idPath` (e.g., `src/pages/gm-reference/dungeons/[id].astro`)
- A page for `allPath` if specified (e.g., `src/pages/gm-reference/dungeons/all.astro`)

## Generated Helpers

The build generates `routes.ts` with:

- **`ROUTES` object** - The full route tree, matching the YAML structure
- **Path helpers** - Functions like `getDungeonPath(id)`, `getHexPath(id)` that interpolate IDs into paths

Example usage:

```typescript
import { getDungeonPath, getStatBlockPath } from '../config/generated/routes';

const url = getDungeonPath('kobold-caves');  // '/gm-reference/dungeons/kobold-caves'
const statBlock = getStatBlockPath('goblin'); // '/gm-reference/stat-blocks/goblin'
```

## Server-Side Resolution

For article and composite routes, the actual URL isn't known until we look up the content's `slug` field. This happens server-side in `src/utils/article-paths.ts`:

- **`getArticlePath(id)`** - Looks up an article by ID, returns its slug
- **`getCompositePath(id)`** - Looks up a composite by ID, returns its slug
- **`resolvePath(route)`** - Takes any typed route, returns the resolved URL

These functions use Astro's `getCollection()` and must run server-side (in `.astro` files or server endpoints), not in client components.

## Key Files

| File                             | Purpose                                 |
|----------------------------------|-----------------------------------------|
| `data/routes.yml`                | Source of truth for all routes          |
| `scripts/generate-config.ts`     | Generates TypeScript from YAML          |
| `src/config/generated/routes.ts` | Generated route definitions and helpers |
| `src/utils/article-paths.ts`     | Server-side path resolution             |

## Adding a New Route

1. Add the route to `data/routes.yml`
2. Run `npm run generate:config` (or it runs automatically on build)
3. If it's a collection, add a path helper function in `generate-config.ts`
4. Use the helper or `resolvePath()` to generate URLs

## Common Patterns

**Link to an article from a component:**
```typescript
// Server-side (.astro file)
const path = await getArticlePath('my-article-id');
```

**Link to a collection item:**
```typescript
// Can be client or server - no async lookup needed
const path = getDungeonPath('kobold-caves');
```

**Resolve any typed route:**
```typescript
// Server-side only
const url = await resolvePath({ type: 'article', id: 'my-article' });
```
