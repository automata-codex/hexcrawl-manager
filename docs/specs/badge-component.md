# Badge Component Consolidation Specification

## Overview

Create reusable Badge components (Astro and Svelte) to replace ad-hoc badge styling throughout the application. The components will support a predefined color palette with automatic light/dark mode handling.

## Goals

- Eliminate ~220+ lines of duplicated badge CSS across the codebase
- Provide consistent visual language for badges/tags
- Simplify dark mode support (handled once in the component)
- Make it trivial to add badges to new features

## Color Palette

Based on existing usage patterns, the component supports these color schemes:

| Name     | Use Cases                                                           | Light BG                       | Light Text          | Dark BG   | Dark Text |
|----------|---------------------------------------------------------------------|--------------------------------|---------------------|-----------|-----------|
| `blue`   | scope: dungeon                                                      | `#dbeafe`                      | `#1e40af`           | `#1e3a5f` | `#93c5fd` |
| `green`  | scope: hex, location type, unlocked/entry status, clue known status | `#dcfce7`                      | `#166534`           | `#14532d` | `#86efac` |
| `orange` | faction                                                             | `#ffedd5`                      | `#c2410c`           | `#7c2d12` | `#fdba74` |
| `purple` | scope: pointcrawl, creature type                                    | `#f3e8ff`                      | `#7e22ce`           | `#581c87` | `#d8b4fe` |
| `pink`   | lead encounters                                                     | `#fce7f3`                      | `#9d174d`           | `#831843` | `#fbcfe8` |
| `cyan`   | scope: herald                                                       | `#cffafe`                      | `#0e7490`           | `#164e63` | `#67e8f9` |
| `amber`  | scope: region, warnings                                             | `#fef3c7`                      | `#92400e`           | `#78350f` | `#fcd34d` |
| `gray`   | neutral/default, generic tags                                       | `var(--bulma-scheme-main-ter)` | `var(--bulma-text)` | (same)    | (same)    |

### Bulma Semantic Colors

For status indicators that should match Bulma's semantic palette:

| Name      | Use Cases               | Implementation                                       |
|-----------|-------------------------|------------------------------------------------------|
| `success` | known status, unlocked  | Bulma's `--bulma-success` / `--bulma-success-invert` |
| `warning` | unknown status, pending | Bulma's `--bulma-warning` / `--bulma-warning-invert` |
| `info`    | informational tags      | Bulma's `--bulma-info` / `--bulma-info-invert`       |
| `danger`  | errors, alerts          | Bulma's `--bulma-danger` / `--bulma-danger-invert`   |

## Component API

### Props

| Prop    | Type         | Default  | Description                      |
|---------|--------------|----------|----------------------------------|
| `color` | `BadgeColor` | `'gray'` | Color scheme (see palette above) |
| `bold`  | `boolean`    | `false`  | Apply `font-weight: 600`         |
| `class` | `string`     | `''`     | Additional CSS classes           |

### TypeScript Types

```typescript
type BadgeColor =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'cyan'
  | 'amber'
  | 'gray'
  | 'success'
  | 'warning'
  | 'info'
  | 'danger';
```

### Usage Examples

#### Astro

```astro
---
import Badge from '../components/Badge.astro';
---

<!-- Basic usage -->
<Badge color="blue">dungeon</Badge>

<!-- Bold variant -->
<Badge color="pink" bold>Lead</Badge>

<!-- Semantic status -->
<Badge color="success">Known</Badge>
<Badge color="warning">Unknown</Badge>

<!-- With additional classes -->
<Badge color="green" class="my-custom-class">Entry Point</Badge>

<!-- Default gray -->
<Badge>generic tag</Badge>
```

#### Svelte

```svelte
<script>
  import Badge from '../components/Badge.svelte';
</script>

<Badge color="purple">pointcrawl</Badge>
<Badge color="success">✓ Unlocked</Badge>
```

## File Locations

```
apps/web/src/components/
├── Badge.astro          # Astro version
├── Badge.svelte         # Svelte version
└── badge-colors.ts      # Shared color definitions (optional)
```

## Implementation Details

### Base Styles

```css
.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  border-radius: 3px;
  font-size: 0.875rem;
  line-height: 1.4;
}

.badge.bold {
  font-weight: 600;
}
```

### Dark Mode Strategy

Use the existing pattern from the codebase:

```css
/* Light mode colors are default */
.badge.blue {
  background: #dbeafe;
  color: #1e40af;
}

/* Dark mode - explicit theme selection */
:global(html[data-theme='dark']) .badge.blue {
  background: #1e3a5f;
  color: #93c5fd;
}

/* Dark mode - system preference when no explicit theme */
@media (prefers-color-scheme: dark) {
  :global(html:not([data-theme])) .badge.blue {
    background: #1e3a5f;
    color: #93c5fd;
  }
}
```

### Semantic Colors (Bulma Integration)

```css
.badge.success {
  background: var(--bulma-success);
  color: var(--bulma-success-invert);
}

.badge.warning {
  background: var(--bulma-warning);
  color: var(--bulma-warning-invert);
}
```

## Migration Plan

### Phase 1: Create Components

1. Create `Badge.astro` with full color palette
2. Create `Badge.svelte` with identical API
3. Add to a test page to verify all colors render correctly in light/dark modes

### Phase 2: Migrate Encounter Pages

**File: `apps/web/src/pages/gm-reference/encounters/[id].astro`**

Before:
```astro
<span class="badge scope">{encounter.scope}</span>
<span class="badge lead">Lead</span>
<span class="badge location">{type}</span>
<span class="badge faction">{faction}</span>
<span class="badge creature">{creatureType}</span>
```

After:
```astro
<Badge color="blue">{encounter.scope}</Badge>
<Badge color="pink" bold>Lead</Badge>
<Badge color="green">{type}</Badge>
<Badge color="orange">{faction}</Badge>
<Badge color="purple">{creatureType}</Badge>
```

Remove: ~80 lines of `.badge.*` CSS and dark mode variants.

### Phase 3: Migrate Encounter List

**File: `apps/web/src/components/EncounterList.svelte`**

Before:
```svelte
<span class="scope-tag scope-dungeon">dungeon</span>
<span class="scope-tag scope-herald">herald</span>
<span class="scope-tag scope-lead">lead</span>
```

After:
```svelte
<Badge color="blue">dungeon</Badge>
<Badge color="cyan">herald</Badge>
<Badge color="pink" bold>lead</Badge>
```

Remove: ~70 lines of `.scope-tag.*` CSS and dark mode variants.

### Phase 4: Migrate Clue List

**File: `apps/web/src/components/ClueList.svelte`**

Before:
```svelte
<span class="status-badge">Known</span>
```

After:
```svelte
<Badge color="green">Known</Badge>
```

Also update the legend:
```svelte
<!-- Before -->
<p class="legend">
  <span class="unused-text">Italic</span> = unused |
  <span class="status-badge">Known</span> = discovered by players
</p>

<!-- After -->
<p class="legend">
  <span class="unused-text">Italic</span> = unused |
  <Badge color="green">Known</Badge> = discovered by players
</p>
```

Remove: ~20 lines of `.status-badge` CSS and dark mode variants.

### Phase 5: Migrate Clue Detail Component

**File: `apps/web/src/components/Clue.astro`**

Before:
```astro
<span class={`tag ${statusColor}`}>{statusLabel}</span>
<span class="tag is-info">{faction}</span>
<span class="tag is-light">{tag}</span>
```

After:
```astro
<Badge color={clue.status === 'known' ? 'success' : 'warning'}>{statusLabel}</Badge>
<Badge color="info">{faction}</Badge>
<Badge color="gray">{tag}</Badge>
```

Note: This replaces Bulma's `.tag` class usage, giving us consistent sizing.

### Phase 6: Migrate Status Badges

**File: `apps/web/src/components/KnowledgeNodeContent.svelte`**

Before:
```svelte
<span class="unlocked-badge">✓ Unlocked</span>
```

After:
```svelte
<Badge color="success">✓ Unlocked</Badge>
```

Remove: `.unlocked-badge` CSS block.

**File: `apps/web/src/components/Pointcrawls/NodeDetails.astro`**

Before:
```astro
<span class="entry-badge">Entry Point</span>
```

After:
```astro
<Badge color="success">Entry Point</Badge>
```

Remove: `.entry-badge` CSS block.

### Phase 7: Migrate Dashboard Tags

**File: `apps/web/src/components/GmDashboard.svelte`**

Before:
```svelte
<span class="tag is-small is-warning is-light">{count} pending</span>
<span class="tag is-small is-info is-light source-tag">template</span>
```

After:
```svelte
<Badge color="warning">{count} pending</Badge>
<Badge color="info">template</Badge>
```

## Scope Mapping Reference

For encounter scopes specifically, use this mapping:

| Scope        | Badge Color      |
|--------------|------------------|
| `dungeon`    | `blue`           |
| `herald`     | `cyan`           |
| `hex`        | `green`          |
| `region`     | `amber`          |
| `pointcrawl` | `purple`         |
| `general`    | (no badge shown) |

For the "Lead" indicator: `pink` with `bold` prop.

## Out of Scope

These patterns should **not** be migrated:

1. **NavbarNagIcon badge** (`apps/web/src/components/NavbarNagIcon.svelte`)
   - Uses absolute positioning for notification count
   - Different visual purpose (floating counter vs. inline tag)

2. **Herald banner** (`apps/web/src/components/RandomEncountersSection.astro`)
   - Full-width banner, not an inline badge
   - Different padding, border, and layout

## Testing Checklist

- [ ] All 12 colors render correctly in light mode
- [ ] All 12 colors render correctly in dark mode (explicit `data-theme="dark"`)
- [ ] All 12 colors render correctly with system dark mode preference
- [ ] `bold` prop applies correct font weight
- [ ] Custom `class` prop merges correctly
- [ ] Astro and Svelte versions are visually identical
- [ ] No CSS conflicts with existing Bulma `.tag` usage elsewhere

## Future Considerations

- **Size variants**: Could add `size="small" | "medium"` prop if needed
- **Icon support**: Could add optional icon slot/prop
- **Clickable badges**: Could add `href` prop for link badges
