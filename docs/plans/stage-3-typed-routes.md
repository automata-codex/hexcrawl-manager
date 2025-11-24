# Stage 3 Completion: Typed Routes and Sidebar References

This plan completes Stage 3 by implementing the typed route system described in the spec. The current implementation uses direct string paths; the spec calls for typed route objects that get resolved dynamically.

## Context

**Current state:**
- `routes.yml` uses direct string paths (e.g., `biomes: /gm-reference/biomes`)
- `sidebar.yml` uses direct string hrefs (e.g., `href: /players-guide/classes`)
- `_defaultSecure` inheritance is working correctly

**Target state:**
- `routes.yml` uses typed route objects (e.g., `biomes: { type: article, id: biomes }`)
- `sidebar.yml` uses typed href references (e.g., `href: { type: article, id: classes }`)
- `resolvePath()` helper resolves typed references to actual URLs

---

## Phase 1: Typed Routes

### Goals
- Update routes configuration to use typed route objects
- Implement `resolvePath()` helper for dynamic URL resolution
- Maintain backward compatibility with security resolution

### Tasks

1. **Update `RoutesConfigSchema`** (`packages/schemas/src/schemas/routes-config.ts`)
   - Define `ArticleRouteSchema`: `{ type: 'article', id: string }`
   - Define `CompositeRouteSchema`: `{ type: 'composite', id: string }`
   - Define `CollectionRouteSchema`: `{ type: 'collection', path: string, idPath: string }`
   - Allow route values to be typed objects or direct strings (for legacy/special cases)

2. **Update `routes.yml`** (`data/routes.yml`)
   - Convert article routes to `{ type: article, id: <article-id> }`
   - Convert collection routes to `{ type: collection, path: <index-path>, idPath: <detail-path> }`
   - Keep `_defaultSecure` settings unchanged

3. **Update code generation** (`apps/web/scripts/generate-config.ts`)
   - Generate `resolvePath()` helper function
   - Generate `getArticlePath()` and `getCompositePath()` helpers
   - Ensure generated code works with typed route objects

4. **Update security resolution** (`apps/web/src/utils/security.ts`)
   - Ensure `findDefaultSecureForPath()` works with new route structure
   - May need to traverse typed objects differently

5. **Validate**
   - Run `npm run validate:config`
   - Run `npm run build:web`
   - Test that existing pages still load correctly

### Example Route Transformations

**Before:**
```yaml
gmReference:
  biomes: /gm-reference/biomes
  dungeons:
    id: /gm-reference/dungeons/[id]
    index: /gm-reference/dungeons
```

**After:**
```yaml
gmReference:
  biomes:
    type: article
    id: biomes
  dungeons:
    type: collection
    path: /gm-reference/dungeons
    idPath: /gm-reference/dungeons/[id]
```

---

## Phase 2: Typed Sidebar References

### Goals
- Update sidebar configuration to use typed href references
- Update sidebar rendering to resolve typed references
- Enable validation that sidebar links reference valid routes/articles

### Tasks

1. **Update `SidebarConfigSchema`** (`packages/schemas/src/schemas/sidebar-config.ts`)
   - Define `SidebarHrefSchema` as union of:
     - `{ type: 'article', id: string }`
     - `{ type: 'composite', id: string }`
     - `{ type: 'collection', path: string }`
     - Direct string (for special cases like image URLs)
   - Update `SidebarItemSchema` to use new href type

2. **Update `sidebar.yml`** (`data/sidebar.yml`)
   - Convert article hrefs to `{ type: article, id: <article-id> }`
   - Convert collection hrefs to `{ type: collection, path: <collection-name> }`
   - Keep direct strings for non-article links (images, external URLs)

3. **Update code generation** (`apps/web/scripts/generate-config.ts`)
   - Ensure sidebar config includes href objects
   - May need to generate type definitions for sidebar hrefs

4. **Update `SideNav.svelte`** (`apps/web/src/components/SideNav.svelte`)
   - Import and use `resolvePath()` helper
   - Resolve typed hrefs before rendering links

5. **Validate**
   - Run `npm run validate:config`
   - Run `npm run build:web`
   - Test sidebar navigation in browser
   - Verify all links work for both player and GM views

### Example Sidebar Transformations

**Before:**
```yaml
items:
  - label: Heritage
    href: /players-guide/ancestries-and-cultures
  - label: Map Regions
    href: /session-toolkit/regions
```

**After:**
```yaml
items:
  - label: Heritage
    href:
      type: article
      id: ancestries-and-cultures
  - label: Map Regions
    href:
      type: collection
      path: regions
```

---

## Success Criteria

- [ ] `routes.yml` uses typed route objects per spec
- [ ] `sidebar.yml` uses typed href references per spec
- [ ] `resolvePath()` helper resolves all route types correctly
- [ ] Security resolution continues to work with typed routes
- [ ] Sidebar navigation works for all user roles
- [ ] Build completes without errors
- [ ] All existing URLs continue to work
