# Typed Sidebar System

This document explains how the sidebar navigation works, including typed href references and server-side resolution.

## Overview

The sidebar configuration lives in YAML and uses typed references to link to content. This provides:

- **Validation** that sidebar links point to real content
- **Automatic URL updates** when article slugs change
- **Role-based filtering** (player vs GM sections)

## Data Flow

```
data/sidebar.yml
      ↓
scripts/generate-config.ts (build time)
      ↓
src/config/generated/sidebar-sections.ts
      ↓
src/utils/resolve-sidebar-hrefs.ts (server-side, per request)
      ↓
SideNav.svelte (client component)
```

The key insight: **typed hrefs are resolved server-side before reaching the client**. The client component only sees plain URL strings.

## Sidebar Structure

The sidebar has two groups:

- **`shared`** - Visible to everyone (players and GMs)
- **`gmOnly`** - Visible only to authenticated GMs

Each group contains **sections**, and each section contains **items**:

```yaml
shared:
  - id: players-guide
    label: "Player's Guide"
    href: /players-guide        # Section's ToC page
    items:
      - id: heritage
        label: Heritage
        href:
          type: article
          id: ancestries-and-cultures
```

## Item Types

### Link Items

Simple navigation links. Have `href` (typed or string).

```yaml
- id: heritage
  label: Heritage
  href:
    type: article
    id: ancestries-and-cultures
```

### Items with ToC Pages

Items that link to a Table of Contents page listing sub-items. Have `hasToC: true`, `tocHref`, and `items`.

```yaml
- id: player-setting
  label: Setting
  hasToC: true
  tocHref: /players-reference/setting
  items:
    - label: The Known World
      href:
        type: article
        id: known-world
```

The `tocHref` is the path to a Table of Contents page that lists all sub-items. Items can be nested to arbitrary depth for ToC pages.

### Expandable Items

Items that expand inline in the sidebar to reveal sub-items. Have `expandable: true`, `id`, and `items`.

```yaml
- id: rules
  label: Rules
  expandable: true
  items:
    - label: House Rules
      href:
        type: composite
        id: house-rules
    - label: Hexcrawl Rules
      href:
        type: article
        id: hexcrawl-rules/hexcrawl-rules
```

Expandable items display a chevron toggle. When clicked, they expand to show their sub-items directly in the sidebar. The `id` is required for tracking expand/collapse state in localStorage.

**Note:** `expandable` and `hasToC` serve different purposes:
- `expandable` controls inline sidebar expansion
- `hasToC` controls linking to a separate Table of Contents page

An item can have both if you want it to expand in the sidebar AND link to a ToC page.

## Href Types

Hrefs can be typed references or plain strings:

### Typed References

```yaml
# Article - resolves via content collection lookup
href:
  type: article
  id: ancestries-and-cultures

# Composite - resolves via composite collection lookup
href:
  type: composite
  id: house-rules

# Collection - path is used directly (no lookup)
href:
  type: collection
  path: /players-reference/setting/bounty-board
```

### Plain Strings

Used for ToC pages, images, and special cases:

```yaml
href: /players-reference/setting   # ToC page
href: /images/maps/gm-map.png      # Static file
href: /players-reference/sessions  # Custom page
```

## Server-Side Resolution

Before the sidebar reaches the client, `resolve-sidebar-hrefs.ts` converts all typed hrefs to URL strings:

1. **Article hrefs** - Looks up the article by ID, returns its `slug`
2. **Composite hrefs** - Looks up the composite by ID, returns its `slug`
3. **Collection hrefs** - Returns the `path` directly (it's already a full URL)

This happens in `BaseLayout.astro`:

```typescript
const rawSections = getSidebarSections(role);
const sections = await resolveSidebarSections(rawSections);
// sections now has string hrefs, safe for client
```

## Two Type Systems

There are **unresolved** types (before resolution) and **resolved** types (after):

| Unresolved (types.ts)                 | Resolved (toc-helpers.ts) |
|---------------------------------------|---------------------------|
| `SidebarSection`                      | `ResolvedSection`         |
| `SidebarItem`                         | `ResolvedItem`            |
| `href: SidebarHref` (typed or string) | `href: string`            |

`SidebarItem` is recursive - items can contain nested `items` to arbitrary depth.

The client component (`SideNav.svelte`) receives `ResolvedSection[]` where all hrefs are plain strings.

## Table of Contents Pages

ToC pages are auto-generated from sidebar config. The system detects ToC pages by checking:

1. **Section hrefs** - If a path matches a section's `href`, render that section's items as a ToC
2. **Group tocHrefs** - If a path matches an item's `tocHref`, render that group's sub-items as a ToC

This happens in `[...page].astro` via `findToCPage()`.

## Key Files

| File                                       | Purpose                                  |
|--------------------------------------------|------------------------------------------|
| `data/sidebar.yml`                         | Source of truth for navigation structure |
| `scripts/generate-config.ts`               | Generates TypeScript from YAML           |
| `src/config/generated/sidebar-sections.ts` | Generated sidebar data                   |
| `src/types.ts`                             | Unresolved sidebar types                 |
| `src/utils/resolve-sidebar-hrefs.ts`       | Converts typed hrefs to URLs             |
| `src/utils/toc-helpers.ts`                 | Resolved types + ToC page detection      |
| `src/components/SideNav.svelte`            | Client-side navigation component         |

## Adding a Sidebar Item

1. Add the item to `data/sidebar.yml`
2. Use a typed href if linking to an article/composite/collection
3. Use a string href for ToC pages or special cases
4. Run build - validation will catch broken references
