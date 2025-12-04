# Knowledge Tree Viewer Refactor - Implementation Plan

**Spec:** `docs/specs/knowledge-tree-viewer.md`

This document outlines the multi-phase implementation plan for refactoring the knowledge tree viewer from a single-page recursive display to a per-node page model with breadcrumb navigation and a toggle-able tree drawer.

---

## Phase 1: Foundation Layer

**Goal:** Add utilities and infrastructure without any UI changes

### Tasks

1. Add `getChildrenForNode()` function to `apps/web/src/utils/knowledge-trees.ts`
   - Navigate to a specific node by path segments and return its children

2. Add `getAncestry()` function to `apps/web/src/utils/knowledge-trees.ts`
   - Build ancestry chain for breadcrumbs from a node key

3. Create `apps/web/src/utils/placement-links.ts`
   - Extract `generateLink()` from `KnowledgeTree.svelte`
   - Extract `generateLabelAppendix()` from `KnowledgeTree.svelte`

### Verification

- Run `npm run typecheck` to ensure no type errors
- No functional changes to the app

---

## Phase 2: Static Components

**Goal:** Create new reusable components that don't yet affect the app

### Tasks

1. Create `apps/web/src/components/Breadcrumbs.astro`
   - Accepts `items` prop with `{ key, name, path }` objects
   - Renders breadcrumb trail with "Knowledge Trees" as root
   - Last item rendered as non-link (current page)

2. Create `apps/web/src/components/KnowledgeNodeContent.svelte`
   - Single-node display extracted/adapted from `KnowledgeTree.svelte`
   - Props: `node`, `nodeKey`, `children`, `placements`
   - Renders: title, description, details toggle, placements list, children links
   - Uses shared `placement-links.ts` utilities

### Verification

- Run `npm run typecheck`
- Components are not yet used, so app behavior unchanged

---

## Phase 3: New Routing and Page Component

**Goal:** Bring the new per-node URL structure online

### Tasks

1. Create `apps/web/src/components/KnowledgeNodePage.astro`
   - Wrapper component for node pages
   - Includes breadcrumbs and node content
   - Placeholder for drawer (added in Phase 4)

2. Create `apps/web/src/pages/gm-reference/knowledge-trees/[...path].astro`
   - Catch-all route replacing `[id].astro`
   - Parse path segments to derive `treeId` and `nodeKey`
   - Redirect to index if path is empty
   - Fetch tree data, build breadcrumbs, get children
   - Build placement map from collections

3. Remove `apps/web/src/pages/gm-reference/knowledge-trees/[id].astro`
   - Old route, replaced by catch-all

### Verification

- Navigate to `/gm-reference/knowledge-trees/history` (root node works)
- Navigate to child nodes via URL path segments
- Breadcrumbs display correctly
- Children list shows links to child nodes
- Placements render with correct links

---

## Phase 4: Tree Drawer

**Goal:** Add the toggle-able tree structure drawer

### Tasks

1. Create `apps/web/src/components/KnowledgeTreeDrawer.svelte`
   - Props: `tree`, `treeId`, `currentNodeKey`
   - "View Tree" button to toggle drawer open
   - Drawer renders full tree structure with indentation
   - Current node highlighted with star
   - Auto-scroll to current node when drawer opens
   - Dismiss via click outside, close button, or Escape key

2. Integrate drawer into `KnowledgeNodePage.astro`
   - Add `KnowledgeTreeDrawer` with `client:load`
   - Position in page header alongside breadcrumbs

### Verification

- "View Tree" button appears on node pages
- Drawer opens and shows full tree structure
- Current node highlighted and scrolled into view
- Click node in drawer navigates to that page
- Drawer dismisses correctly (outside click, X button, Escape)
- Mobile: drawer doesn't overflow viewport

---

## Phase 5: Cleanup

**Goal:** Remove deprecated code and verify everything works

### Tasks

1. Update `KnowledgeTree.svelte` to import from shared `placement-links.ts`
   - Or remove component if no longer used elsewhere

2. Evaluate store simplification
   - `knowledgeTreeExpanded` store may no longer be needed (children are now links)
   - `knowledgeTreeDetails` store can potentially use local component state instead

3. Run through testing checklist from spec:
   - [ ] Root tree page displays correctly
   - [ ] Child node pages display with correct breadcrumbs
   - [ ] Deep nodes (4+ levels) have full breadcrumb trail
   - [ ] Children list shows all immediate children with working links
   - [ ] Placements render correctly with proper links
   - [ ] Details toggle expands/collapses
   - [ ] "View Tree" button opens drawer
   - [ ] Drawer shows full tree structure
   - [ ] Current node highlighted in drawer
   - [ ] Drawer auto-scrolls to current node
   - [ ] Click node in drawer navigates to that page
   - [ ] Click outside drawer closes it
   - [ ] Escape key closes drawer
   - [ ] Mobile: drawer doesn't overflow viewport
   - [ ] `Unlocks.svelte` still resolves node references correctly
   - [ ] Existing `unlocks` references in encounters/hexes/dungeons still work

### Verification

- Full manual testing pass
- No console errors
- No unused code remaining

---

## Files Modified/Created

### Phase 1
- `apps/web/src/utils/knowledge-trees.ts` (modified)
- `apps/web/src/utils/placement-links.ts` (new)

### Phase 2
- `apps/web/src/components/Breadcrumbs.astro` (new)
- `apps/web/src/components/KnowledgeNodeContent.svelte` (new)

### Phase 3
- `apps/web/src/components/KnowledgeNodePage.astro` (new)
- `apps/web/src/pages/gm-reference/knowledge-trees/[...path].astro` (new)
- `apps/web/src/pages/gm-reference/knowledge-trees/[id].astro` (deleted)

### Phase 4
- `apps/web/src/components/KnowledgeTreeDrawer.svelte` (new)
- `apps/web/src/components/KnowledgeNodePage.astro` (modified)

### Phase 5
- `apps/web/src/components/KnowledgeTree.svelte` (modified or deleted)
- `apps/web/src/stores/knowledge-tree-state.ts` (possibly simplified)
