# Stage 2: Table of Contents Pages - Implementation Plan

## Overview

Replace deep sidebar nesting with ToC (Table of Contents) pages. Currently, the sidebar has expandable sections that require multiple clicks to navigate. ToC pages provide a scannable overview of each section.

## Design Decisions

- **All sections get ToC pages**, including Player's Guide and small sections (Puzzles, Setting, Minigames)
- **YAML-only ToC pages** - rendered from sidebar config at runtime, no separate markdown files
- **Hybrid sidebar behavior** - items remain expandable AND have link to ToC page

## Phases

### Phase 1: Update Types and Schemas

**Files to modify:**
- `apps/web/src/types.ts`

**Changes:**
```typescript
interface SidebarItem {
  id: string;
  label: string;
  href?: string;
  expandable?: boolean;
  hasToC?: boolean;      // NEW: indicates this item has a ToC page
  tocHref?: string;      // NEW: path to ToC page (if hasToC)
  items?: { label: string; href: string }[];
}

interface SidebarSection {
  id: string;
  label: string;
  href?: string;         // NEW: link to section's ToC page
  items: SidebarItem[];
}
```

---

### Phase 2: Create ToC Component

**Files to create:**
- `apps/web/src/components/TableOfContents.astro`

**Features:**
- Display section title
- List all items as links
- Clean, scannable layout
- Reuse `ArticleLayout` for consistency

---

### Phase 3: Update Catch-All Handler

**Files to modify:**
- `apps/web/src/pages/[...article].astro`

**Logic:**
1. Check if path matches a ToC page (from sidebar config)
2. If yes, render ToC component with items from sidebar
3. Otherwise, continue to composite/simple article logic

**Helper function needed:**
- `findToCSection(path, sidebarConfig)` - returns section/item if path is a ToC page

---

### Phase 4: Update Sidebar Configuration

**Files to modify:**
- `apps/web/src/config/sidebar-sections.ts`

**ToC pages to add (14 total):**

| Path | Section |
|------|---------|
| `/players-guide` | Player's Guide (top-level) |
| `/players-reference` | Player's Reference (top-level) |
| `/players-reference/setting` | Setting subsection |
| `/players-reference/maps` | Maps subsection |
| `/players-reference/rules` | Rules subsection |
| `/session-toolkit` | Session Toolkit (top-level) |
| `/session-toolkit/clues` | Clues subsection |
| `/session-toolkit/maps` | Maps subsection |
| `/session-toolkit/roleplay-books` | Roleplay Books subsection |
| `/session-toolkit/minigames` | Minigames subsection |
| `/gm-reference` | GM Reference (top-level) |
| `/gm-reference/first-civilization` | First Civilization subsection |
| `/gm-reference/puzzles` | Puzzles subsection |
| `/gm-reference/setting` | Setting subsection |

---

### Phase 5: Update SideNav Rendering

**Files to modify:**
- `apps/web/src/components/SideNav.svelte`

**Behavior changes:**
1. **Top-level sections**: Section label becomes a link to ToC page, chevron still expands/collapses
2. **Items with `hasToC`**: Item label links to ToC page, chevron still expands sub-items
3. **Visual indicator**: Add subtle icon or styling to indicate "view all" link

---

### Phase 6: Build Validation & Testing

1. Add build-time validation ensuring ToC paths in sidebar config are valid
2. Run full build
3. Manual testing of navigation flow
4. Verify all existing URLs still work

---

## Summary of Changes

| Phase | Files | Description |
|-------|-------|-------------|
| 1 | `types.ts` | Add `hasToC`, `tocHref`, section `href` |
| 2 | `TableOfContents.astro` (new) | ToC page component |
| 3 | `[...article].astro` | Handle ToC page routing |
| 4 | `sidebar-sections.ts` | Add ToC hrefs to 14 sections |
| 5 | `SideNav.svelte` | Hybrid expand + link behavior |
| 6 | Build & test | Validation and verification |

## Success Criteria

- [ ] Top-level sections link to ToC pages
- [ ] ToC pages render all sub-items from configuration
- [ ] Sidebar supports hybrid behavior (expand + link)
- [ ] All 14 ToC pages render correctly
- [ ] All existing URLs continue to work
- [ ] Navigation is more scannable and accessible
