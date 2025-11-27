# KnowledgeTree Component Refactor Specification

## Overview

Refactor `apps/web/src/components/KnowledgeTree.svelte` to use a unified layout model that eliminates alignment inconsistencies between leaf nodes, parent nodes, chevrons, bullets, and details sections.

## Current Problems

1. **Divergent rendering paths**: Leaf nodes use `<ul class="leaf-node"><li>` wrapper while parent nodes use `<div class="node-content">`. This prevents consistent alignment rules.

2. **Mixed indentation systems**:
   - Chevron button: `width: 1.5em`
   - Leaf node list: `padding-inline-start: 1.5rem`
   - Details container: `padding-left: 1.5rem`
   - Child tree wrapper: `margin-left: 1.5em`

3. **Details section uses different layout**: Inline-flex with gap, creating a third alignment approach.

4. **Nested lists for placements**: Each placement list adds its own `<ul>` with independent padding.

## Target Layout Model

Every node (leaf or parent) uses the same three-column structure:

```
┌─────────────┬─────────────┬────────────────────────────────────┐
│ indent-zone │ icon-column │ content-column                     │
│ (0 at root) │ (fixed 1.5) │ (flex: 1)                          │
├─────────────┼─────────────┼────────────────────────────────────┤
│             │     ▶       │ Name: Description ✓ Unlocked       │
│             │             │ ▶ Details                          │
│             │             │   [expanded details content]       │
│             │             │ • Placement Link (Type)            │
│             │             │ • Placement Link (Type)            │
└─────────────┴─────────────┴────────────────────────────────────┘
```

### Column specifications

| Column         | Width                  | Contents                                                                                    |
|----------------|------------------------|---------------------------------------------------------------------------------------------|
| indent-zone    | `calc(depth * 1.5rem)` | Empty space, applied via padding-left on row wrapper                                        |
| icon-column    | `1.5rem` fixed         | Chevron (parent nodes) OR bullet character (leaf nodes) OR empty                            |
| content-column | `flex: 1`              | Node name, description, unlocked indicator, details toggle, details content, placement list |

### Icon column contents by node type

- **Parent node (has children)**: Clickable chevron that rotates on expand/collapse
- **Leaf node (no children)**: Bullet character (`•` or similar) — NOT a native list bullet
- **Alternative**: Empty for all nodes, use subtle visual distinction in content column instead

## Implementation Requirements

### 1. Unified node template

Remove the `{#if !node.children?.length}` / `{:else}` split. All nodes render with the same structure:

```svelte
<div class="node-row" style="padding-left: {depth * 1.5}rem">
  <div class="icon-column">
    {#if node.children?.length}
      <button onclick={() => (isExpanded = !isExpanded)}>
        <span class="chevron" class:rotated={isExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
      </button>
    {:else}
      <span class="bullet">•</span>
    {/if}
  </div>
  <div class="content-column">
    <!-- name, description, details, placements — same for all nodes -->
  </div>
</div>
```

### 2. Add depth prop

The component needs to track its depth in the tree for indentation:

```svelte
interface Props {
  node: KnowledgeNodeData;
  fullId?: string;
  placementMap?: Record<string, PlacementRef[]>;
  depth?: number;  // NEW
}

let { node, fullId = node.id, placementMap = {}, depth = 0 }: Props = $props();
```

Pass `depth={depth + 1}` to child `<KnowledgeTree>` instances.

### 3. Eliminate wrapper lists

Do NOT use `<ul>` / `<li>` for node structure. The bullet is a visual element in the icon column, not a semantic list.

Placement lists CAN remain as `<ul>` since they are genuinely lists, but they should not add left padding — they inherit the content column's alignment.

### 4. CSS layout rules

```css
.node-row {
  display: flex;
  align-items: flex-start;
  /* padding-left set via inline style based on depth */
}

.icon-column {
  width: 1.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 0.1em; /* Align with text baseline if needed */
}

.icon-column button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 1em;
}

.icon-column .bullet {
  color: var(--bulma-text-weak, #888);
}

.content-column {
  flex: 1;
  min-width: 0; /* Prevent flex blowout */
}
```

### 5. Details section alignment

The details toggle and content should align with the rest of the content column, not have their own indentation logic:

```svelte
<div class="details-section">
  <button class="details-toggle" onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
    <span class="chevron" class:rotated={isDetailsExpanded}>
      <FontAwesomeIcon icon={faChevronRight} />
    </span>
    <strong>Details</strong>
  </button>
  {#if isDetailsExpanded}
    <div class="details-content">
      {@html renderedDetails}
    </div>
  {/if}
</div>
```

```css
.details-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--bulma-text);
}

.details-toggle .chevron {
  width: 1em;
  font-size: 0.85em; /* Slightly smaller than node chevron */
}

.details-content {
  margin-left: 1.25rem; /* Align with "Details" text, past the mini-chevron */
  margin-top: 0.5rem;
}
```

### 6. Placement list alignment

```css
.placement-list {
  list-style: disc;
  margin: 0.25rem 0 0 1.25rem; /* Align bullets with content, not icon column */
  padding: 0;
}

.placement-list li {
  margin: 0.125rem 0;
}
```

### 7. Children container

Remove the inline style and use a class:

```svelte
{#if isExpanded && node.children?.length}
  <div class="children-container">
    {#each node.children as child}
      <KnowledgeTree
        node={child}
        fullId={`${fullId}.${child.id}`}
        {placementMap}
        depth={depth + 1}
      />
    {/each}
  </div>
{/if}
```

```css
.children-container {
  /* No margin-left here — depth-based padding handles indentation */
}
```

## Preserve existing functionality

The following must work identically after refactor:

1. **Expand/collapse children**: Click chevron to show/hide child nodes
2. **Expand/collapse details**: Click "Details" to show/hide rendered markdown
3. **Placement links**: Generate correct routes via `generateLink()`
4. **Placement type labels**: Show "(Dungeon)", "(Encounter)", etc.
5. **Unlocked indicator**: Green checkmark for `node.isUnlocked`
6. **Unused styling**: Visual distinction for nodes with no placements
7. **Async markdown rendering**: `$effect` that calls `renderBulletMarkdown()`
8. **Recursive rendering**: Component renders its own children

## Testing checklist

After implementation, verify:

- [ ] Root-level parent node aligns correctly
- [ ] Root-level leaf node aligns with parent nodes (icon column consistent)
- [ ] Nested children indent by exactly 1.5rem per level
- [ ] Chevrons and bullets vertically align with node name text
- [ ] Details chevron is visually subordinate (smaller) to node chevron
- [ ] Expanded details content doesn't break alignment
- [ ] Placement list bullets align consistently
- [ ] "Not placed" indicator aligns with placement list items
- [ ] Deep nesting (4+ levels) doesn't cause horizontal overflow
- [ ] Collapse/expand animations still work (chevron rotation)

## Optional enhancements (not required)

These could be added but are not part of the core refactor:

1. **Collapse all / expand all**: Add props or context for bulk state control
2. **Keyboard navigation**: Arrow keys to traverse tree
3. **Indentation guides**: Subtle vertical lines connecting parent to children
4. **Virtualization**: For very large trees, only render visible nodes
