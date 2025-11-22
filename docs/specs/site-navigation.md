# Campaign Site Navigation and Content Refactoring Specification

## Overview

This specification outlines a comprehensive refactoring of the Skyreach campaign management tool to:
1. Simplify article path management by eliminating manual route mapping
2. Implement table-of-contents (ToC) pages for better content navigation
3. Move all content configuration to YAML to enable future repository separation

The refactoring is divided into three stages, each building on the previous stage's foundation.

---

## Stage 1: Article System Refactor

### Goals
- Eliminate the `ARTICLE_ROUTES` array from `apps/web/src/config/routes.ts`
- Make articles self-describing with `id` and `slug` in frontmatter
- Create a unified catch-all route handler
- Support both simple articles and composite articles (multi-part pages)

### Current State

**Simple Articles:**
- Located in `data/articles/` as markdown/MDX files
- Have frontmatter with `title` and optional `secure` flag
- Manually mapped to paths in `ARTICLE_ROUTES` array
- Rendered by `apps/web/src/pages/[...article].astro`

**Composite Articles:**
- Dedicated `.astro` files (e.g., `apps/web/src/pages/players-reference/setting/cosmology.astro`)
- Combine multiple article files with custom rendering logic
- Use `<SecretContent>` wrapper to show/hide GM-only sections

**Example Current Article:**
```markdown
---
title: "Biomes"
secure: true
---

Article content here...
```

**Example Current Route Mapping:**
```typescript
export const ARTICLE_ROUTES: RouteData[] = [
  {
    slug: 'biomes',
    path: ROUTES.gmReference.biomes,
  },
  // ... 50+ more entries
];
```

### Target State

**Simple Articles:**
```yaml
---
id: biomes
slug: /gm-reference/biomes
title: Biomes
secure: true
---

Article content here...
```

**Composite Articles:**
```yaml
# data/composite-articles/cosmology.yml
id: cosmology
slug: /players-reference/setting/cosmology
title: Cosmology
sections:
  - articleId: cosmology-public
    secure: false
  - articleId: cosmology-secret
    secure: true
```

**Routes Configuration:**
```typescript
export const ROUTES = {
  gmReference: {
    biomes: { type: 'article', id: 'biomes' },
    // ...
  },
  playersReference: {
    setting: {
      cosmology: { type: 'composite', id: 'cosmology' },
      westernFrontier: { type: 'article', id: 'western-frontier' },
    }
  }
}
```

### Implementation Requirements

#### 1. Update Article Schema

Add new required fields to article frontmatter schema:
- `id`: string (unique identifier, used for references)
- `slug`: string (full URL path, starting with `/`)

Existing fields remain:
- `title`: string
- `secure`: boolean (optional, defaults to false)

#### 2. Create Composite Articles Collection

New collection: `composite-articles`
- Location: `data/composite-articles/`
- Format: YAML files
- Schema:
  ```typescript
  {
    id: string;           // Unique identifier
    slug: string;         // Full URL path
    title: string;        // Page title
    sections: Array<{
      articleId: string;  // Reference to article in articles collection
      secure: boolean;    // Whether to wrap in SecretContent
    }>;
  }
  ```

#### 3. Create Path Resolution Helpers

In `apps/web/src/config/routes.ts`:

```typescript
export function getArticlePath(articleId: string): string {
  const article = allArticles.find(a => a.data.id === articleId);
  if (!article) throw new Error(`Article not found: ${articleId}`);
  return article.data.slug;
}

export function getCompositePath(compositeId: string): string {
  const composite = allComposites.find(c => c.data.id === compositeId);
  if (!composite) throw new Error(`Composite not found: ${compositeId}`);
  return composite.data.slug;
}

export function resolvePath(route: RouteConfig): string {
  if (typeof route === 'string') return route; // Direct path (legacy/special cases)
  if (route.type === 'article') return getArticlePath(route.id);
  if (route.type === 'composite') return getCompositePath(route.id);
  throw new Error(`Unknown route type: ${JSON.stringify(route)}`);
}
```

#### 4. Update Catch-All Route Handler

Modify `apps/web/src/pages/[...article].astro` to:
1. Get current path from `Astro.url.pathname`
2. Try to find composite article by slug
3. If found, render composite article (iterate sections, wrap secure sections in `<SecretContent>`)
4. If not found, try to find simple article by slug
5. If found, render simple article
6. If not found, return 404

#### 5. Migration Path

1. Extract current `ARTICLE_ROUTES` data to generate initial `id` and `slug` values
2. Update all article frontmatter with new fields
3. Identify composite articles (dedicated `.astro` files) and create corresponding YAML configs
4. Update `ROUTES` object to reference article/composite IDs instead of paths
5. Update sidebar configuration to use `resolvePath()` helper
6. Delete `ARTICLE_ROUTES` array
7. Delete dedicated composite article `.astro` files

### Success Criteria

- [ ] All articles have `id` and `slug` in frontmatter
- [ ] All composite articles have corresponding YAML configs
- [ ] `ARTICLE_ROUTES` array is deleted
- [ ] Catch-all route handler works for both simple and composite articles
- [ ] All existing article URLs continue to work
- [ ] Sidebar navigation continues to work
- [ ] No duplicate path definitions in codebase

---

## Stage 2: Table of Contents Pages

### Goals
- Replace deeply nested sidebar menus with ToC pages
- Generate ToC pages from sidebar configuration
- Maintain quick access to major sections via sidebar
- Create single source of truth for navigation structure

### Current State

Sidebar has deep nesting, especially in GM sections:
```typescript
{
  id: 'gm-reference',
  label: 'GM Reference',
  items: [
    {
      id: 'first-civilization',
      label: 'First Civilization',
      expandable: true,
      items: [
        { label: 'The Velari', href: '...' },
        { label: 'Demographics', href: '...' },
        { label: 'Crystals', href: '...' },
        // ... 10+ more items
      ]
    },
    // ... many more nested sections
  ]
}
```

### Target State

**Sidebar (simplified, hybrid approach):**
```typescript
{
  id: 'gm-reference',
  label: 'GM Reference',
  href: '/gm-reference',  // Links to ToC page
  items: [
    { label: 'Biomes', href: '/gm-reference/biomes' },
    {
      label: 'First Civilization',
      href: '/gm-reference/first-civilization',  // Links to ToC page
      hasToC: true,
      items: [
        { label: 'The Velari', href: '...' },
        { label: 'Demographics', href: '...' },
        // All items displayed on ToC page
      ]
    },
  ]
}
```

**ToC Page (`/gm-reference/first-civilization`):**
```
First Civilization

• The Velari
• Demographics
• The Catastrophe and Aftermath
• Scar Sites
• The Skyspire
• Occupations at the Skyspire
• Skyspire Materials and Zones
• Skyspire Original Zones
• Skyspire Terrain
• Crystals
• Crystal Reference
• Airships
```

### Implementation Requirements

#### 1. Update Sidebar Configuration Schema

Extend `SidebarSection` and `SidebarItem` types:

```typescript
interface SidebarItem {
  id: string;
  label: string;
  href: string;
  hasToC?: boolean;      // If true, this item has a ToC page
  items?: SidebarItem[]; // Sub-items (rendered on ToC page if hasToC=true)
}

interface SidebarSection {
  id: string;
  label: string;
  href: string;          // Top-level sections always have ToC pages
  items: SidebarItem[];
}
```

#### 2. Update Sidebar Rendering

Modify `apps/web/src/components/SideNav.svelte`:
- Top-level sections: Always link to ToC page (not expandable)
- Second-level items without `hasToC`: Direct links (current behavior)
- Second-level items with `hasToC`: Links to ToC page (not expandable)
- Never render third-level nesting in sidebar

#### 3. Create ToC Page Generator

Update catch-all route handler to recognize ToC pages:

```typescript
// [...catchall].astro
const path = Astro.url.pathname;

// 1. Try ToC pages (from sidebar config)
const tocSection = findToCSection(path, sidebarConfig);
if (tocSection) {
  return renderToC(tocSection);
}

// 2. Try composite articles
// ... (from Stage 1)

// 3. Try simple articles
// ... (from Stage 1)

// 4. 404
```

**ToC Page Rendering:**
- Display section title
- Optionally display section description/intro
- List all items in the section as links
- Group by categories if items have `groupLabel` metadata
- Include simple search/filter input (uses browser's built-in Ctrl+F)

#### 4. Simplify GM Sections

Flatten the following deeply nested sections:
- `gm-reference` → All expandable subsections become ToC pages
- `session-toolkit` → All expandable subsections become ToC pages

**Example transformation:**

Before (nested):
```typescript
{
  id: 'clues',
  label: 'Clues',
  expandable: true,
  items: [
    { label: 'Floating Clues', href: '...' },
    { label: 'Clues for Alistar', href: '...' },
    { label: 'Clues for Daemaris', href: '...' },
    { label: 'Clues for Thorn', href: '...' },
    { label: 'Drunken Soldier', href: '...' },
    { label: 'Twin Sigils', href: '...' },
  ]
}
```

After (ToC-based):
```typescript
{
  label: 'Clues',
  href: '/session-toolkit/clues',
  hasToC: true,
  items: [
    { label: 'Floating Clues', href: '/session-toolkit/clues/floating-clues' },
    { label: 'Clues for Alistar', href: '/session-toolkit/clues/clues-for-alistar' },
    // ... (same items, now shown on ToC page)
  ]
}
```

#### 5. ToC Page Styling

Create `apps/web/src/components/TableOfContents.astro`:
- Clean, scannable layout
- Optional section headers/dividers
- Links in readable list format
- Responsive design
- Print-friendly

### Success Criteria

- [ ] Top-level sections link to ToC pages
- [ ] ToC pages render all sub-items from configuration
- [ ] Sidebar is simplified (no deep nesting)
- [ ] GM sections use ToC pages for organization
- [ ] Player sections remain as-is (they're not too numerous)
- [ ] Navigation is more scannable and less click-heavy
- [ ] Single source of truth for navigation structure

---

## Stage 3: YAML-Based Configuration

### Goals
- Move `ROUTES` configuration from TypeScript to YAML
- Move sidebar configuration from TypeScript to YAML
- Enable future repository separation (code vs. campaign data)
- Keep all campaign-specific data in `data/` directory

### Current State

All configuration in TypeScript:
- `apps/web/src/config/routes.ts` - Route definitions
- `apps/web/src/config/sidebar-sections.ts` - Navigation structure

### Target State

All configuration in YAML:
- `data/routes.yml` - Route definitions
- `data/sidebar.yml` - Navigation structure

### Implementation Requirements

#### 1. Create Routes YAML Schema

```yaml
# data/routes.yml
gmReference:
  biomes:
    type: article
    id: biomes

  dungeons:
    type: collection
    path: /gm-reference/dungeons
    idPath: /gm-reference/dungeons/[id]

  encounters:
    type: collection
    path: /gm-reference/encounters
    idPath: /gm-reference/encounters/[id]

  firstCivilization:
    velari:
      type: article
      id: velari
    skyspire:
      type: article
      id: skyspire

  setting:
    cosmology:
      type: composite
      id: cosmology

playersReference:
  setting:
    westernFrontier:
      type: article
      id: western-frontier
    bountyBoard:
      type: collection
      path: /players-reference/setting/bounty-board
      idPath: /players-reference/setting/bounty-board/[id]

sessionToolkit:
  clues:
    floatingClues:
      type: collection
      path: /session-toolkit/clues/floating-clues
      idPath: /session-toolkit/clues/floating-clues/[id]

  hexes:
    type: collection
    path: /session-toolkit/hexes
    idPath: /session-toolkit/hexes/[id]
```

**Route Types:**
- `article`: Single markdown article (resolved via `id`)
- `composite`: Multi-part article (resolved via `id`)
- `collection`: Dynamic routes for collections (uses explicit `path` and `idPath`)
- Direct string: Legacy/special cases (e.g., image paths)

#### 2. Create Sidebar YAML Schema

```yaml
# data/sidebar.yml
shared:
  - id: players-guide
    label: "Player's Guide"
    href: /players-guide
    items:
      - label: Heritage
        href:
          type: article
          id: ancestries-and-cultures

      - label: Class
        href:
          type: article
          id: classes

      - label: Goals
        href:
          type: article
          id: character-goals

  - id: players-reference
    label: "Player's Reference"
    href: /players-reference
    items:
      - label: Progress Tracker
        href:
          type: article
          id: progress

      - label: Setting
        href: /players-reference/setting
        hasToC: true
        items:
          - label: The Known World
            href:
              type: article
              id: known-world

          - label: Explored Hexes
            href:
              type: article
              id: baruun-khil-map

gmOnly:
  - id: session-toolkit
    label: Session Toolkit
    href: /session-toolkit
    items:
      - label: Map Regions
        href:
          type: collection
          path: regions

      - label: Hex Catalog
        href:
          type: collection
          path: hexes

      - label: Clues
        href: /session-toolkit/clues
        hasToC: true
        items:
          - label: Floating Clues
            href:
              type: collection
              path: floating-clues

          - label: Clues for Alistar
            href:
              type: article
              id: clues-for-alistar

  - id: gm-reference
    label: GM Reference
    href: /gm-reference
    items:
      - label: Biomes
        href:
          type: article
          id: biomes

      - label: First Civilization
        href: /gm-reference/first-civilization
        hasToC: true
        items:
          - label: The Velari
            href:
              type: article
              id: velari

          - label: Crystals
            href:
              type: article
              id: crystals
```

**href Types:**
- Object with `type` and `id`: Resolved using route helpers
- Object with `type: collection` and `path`: Resolved using route helpers
- Plain string: Direct path (for special cases)

#### 3. Update TypeScript to Load YAML

```typescript
// apps/web/src/config/routes.ts
import routesYaml from '../../../data/routes.yml';

export const ROUTES = routesYaml;

// Helper functions remain (getArticlePath, getCompositePath, resolvePath)
// These now operate on YAML-loaded data
```

```typescript
// apps/web/src/config/sidebar-sections.ts
import sidebarYaml from '../../../data/sidebar.yml';
import { canAccess } from '../utils/auth';
import { SCOPES } from '../utils/constants';

export function getSidebarSections(role: string | null): SidebarSection[] {
  const { shared, gmOnly } = sidebarYaml;

  if (canAccess(role, [SCOPES.GM])) {
    return [...shared, ...gmOnly];
  }
  if (canAccess(role, [SCOPES.PUBLIC, SCOPES.PLAYER])) {
    return shared;
  }
  return shared;
}
```

#### 4. Update Path Resolution

Enhance `resolvePath()` to handle YAML-based route configs:

```typescript
export function resolvePath(route: string | RouteConfig): string {
  // Direct string path
  if (typeof route === 'string') {
    return route;
  }

  // Article reference
  if (route.type === 'article') {
    return getArticlePath(route.id);
  }

  // Composite article reference
  if (route.type === 'composite') {
    return getCompositePath(route.id);
  }

  // Collection reference (uses explicit path)
  if (route.type === 'collection') {
    return route.path;
  }

  throw new Error(`Unknown route type: ${JSON.stringify(route)}`);
}
```

#### 5. Update Sidebar Rendering

Update `SideNav.svelte` to use `resolvePath()` for all href values:

```svelte
<a href={resolvePath(item.href)}>{item.label}</a>
```

#### 6. Migration Strategy

1. Generate `data/routes.yml` from current `ROUTES` TypeScript object
2. Generate `data/sidebar.yml` from current sidebar configuration
3. Update imports to load from YAML files
4. Test that all routes resolve correctly
5. Test that sidebar renders correctly
6. Delete TypeScript configuration objects (keep helper functions)
7. Update `.gitignore` to prepare for future repo split

### Success Criteria

- [ ] `data/routes.yml` exists and defines all routes
- [ ] `data/sidebar.yml` exists and defines navigation structure
- [ ] All routes resolve correctly from YAML config
- [ ] Sidebar renders correctly from YAML config
- [ ] TypeScript helper functions work with YAML-loaded data
- [ ] All campaign-specific data lives in `data/` directory
- [ ] Code repository has no hardcoded campaign-specific paths
- [ ] Future repo split is now feasible

---

## Repository Split Preparation

After all three stages are complete, the codebase will be ready for repository separation:

**Data Repository (private):**
- `data/` directory (all content and configuration)
- Campaign-specific assets (maps, images specific to campaign)

**Code Repository (public):**
- `apps/` directory (Astro application)
- `packages/` directory (schemas, utilities)
- Generic assets and styling
- Documentation

**Integration:**
- Code repo imports data repo as git submodule or npm package
- All path resolution happens dynamically based on data repo contents
- No campaign-specific information leaked in code repo

---

## Testing Checklist

After each stage:

- [ ] All existing URLs continue to work
- [ ] Sidebar navigation renders correctly for all user roles
- [ ] ToC pages render with correct links
- [ ] Article pages render with correct content
- [ ] Composite article pages render with correct sections
- [ ] Secure content shows/hides correctly based on user role
- [ ] No console errors or warnings
- [ ] Build completes successfully
- [ ] No broken links in generated site

---

## Notes for Implementation

1. **Incremental approach**: Complete and test each stage fully before moving to the next
2. **Backward compatibility**: Maintain existing URLs throughout refactoring
3. **Type safety**: Generate TypeScript types from YAML schemas where possible
4. **Validation**: Add build-time validation for route references and article IDs
5. **Error messages**: Provide clear error messages for missing articles, invalid routes, etc.
6. **Migration scripts**: Create one-time migration scripts to generate initial YAML configs
