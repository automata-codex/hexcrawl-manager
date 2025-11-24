# Stage 3: YAML-Based Configuration - Implementation Plan

## Overview

Move route and sidebar configuration from TypeScript to YAML files, implement route-level security defaults, and prepare for future repository separation.

## Key Goals

- Move `ROUTES` from `routes.ts` to `data/routes.yml`
- Move sidebar config from `sidebar-sections.ts` to `data/sidebar.yml`
- Implement `_defaultSecure` inheritance for route-level security
- Keep all campaign-specific data in `data/` directory

---

## Phase 1: YAML Infrastructure and Schemas

**Files to create:**

- `packages/schemas/src/schemas/routes.ts` - Zod schema for routes.yml
- `packages/schemas/src/schemas/sidebar.ts` - Zod schema for sidebar.yml
- `apps/web/src/utils/yaml-loaders.ts` - Utility functions to load/validate YAML

**Work:**

1. Define Zod schema for route configuration (handles string paths, article refs, composite refs, collections)
2. Define Zod schema for sidebar configuration (shared/gmOnly sections)
3. Create loader utilities that validate YAML against schemas
4. Export schemas from packages/schemas barrel

---

## Phase 2: Create routes.yml

**Files to create:**

- `data/routes.yml`

**Work:**

1. Generate `routes.yml` from current `ROUTES` object structure
2. Add `_defaultSecure: true` to `gmReference` and `sessionToolkit` top-level sections
3. Keep structure flat for now (same as current ROUTES object)
4. Validate generated YAML against schema

**Note:** Initial version keeps string paths. Converting to typed references (article/composite) is optional future work.

---

## Phase 3: Create sidebar.yml

**Files to create:**

- `data/sidebar.yml`

**Work:**

1. Generate `sidebar.yml` from current `sidebar-sections.ts` (both shared and gmOnly arrays)
2. Keep href values as strings (same as current)
3. Preserve all existing fields (id, label, href, expandable, hasToC, tocHref, items)
4. Validate generated YAML against schema

---

## Phase 4: Update Configuration Loading

**Files to modify:**

- `apps/web/src/config/routes.ts`
- `apps/web/src/config/sidebar-sections.ts`

**Work:**

1. Update `routes.ts` to load from `data/routes.yml`
2. Update `sidebar-sections.ts` to load from `data/sidebar.yml`
3. Keep existing helper functions (interpolateRoute, getDungeonPath, etc.)
4. Keep existing `getSidebarSections()` function interface
5. Test that everything still works

---

## Phase 5: Implement Security Resolution

**Files to create:**

- `apps/web/src/utils/security.ts`

**Files to modify:**

- `apps/web/src/pages/[...article].astro`

**Work:**

1. Create `isSecureRoute(path, articleSecure?)` function
2. Implement `findDefaultSecureForPath()` that walks route config tree
3. Update catch-all handler to use `isSecureRoute()` instead of direct `article.data.secure` check
4. Test with GM-only articles that don't have explicit `secure: true`

---

## Phase 6: Migration Cleanup

**Files to modify:**

- Various article frontmatter files in `data/articles/`

**Work:**

1. Identify articles under `gmReference` and `sessionToolkit` paths with explicit `secure: true`
2. Remove redundant `secure: true` from these articles (inherited from `_defaultSecure`)
3. Verify security still works correctly
4. Add build-time validation for YAML configs

---

## Phase 7: Validation and Testing

**Work:**

1. Create/update validation scripts for routes.yml and sidebar.yml
2. Add to prebuild pipeline
3. Full manual testing:
   - All existing URLs work
   - Sidebar navigation works for all roles
   - Security shows/hides correctly
   - ToC pages still work
4. Verify no broken links

---

## Summary of Changes

| Phase | Files                             | Description                    |
| ----- | --------------------------------- | ------------------------------ |
| 1     | schemas, yaml-loaders.ts          | YAML infrastructure            |
| 2     | routes.yml                        | Routes configuration in YAML   |
| 3     | sidebar.yml                       | Sidebar configuration in YAML  |
| 4     | routes.ts, sidebar-sections.ts    | Load config from YAML          |
| 5     | security.ts, [...article].astro   | Route-level security           |
| 6     | articles/\*.md                    | Remove redundant secure fields |
| 7     | validation, testing               | Final validation               |

---

## Success Criteria

- [ ] `data/routes.yml` defines all routes
- [ ] `data/sidebar.yml` defines navigation structure
- [ ] Routes load correctly from YAML
- [ ] Sidebar loads correctly from YAML
- [ ] `_defaultSecure` inheritance works
- [ ] Articles can omit `secure` when inherited from route
- [ ] All existing URLs continue to work
- [ ] Build-time validation catches errors
