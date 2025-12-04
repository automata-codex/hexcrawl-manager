# Knowledge Tree Viewer Refactor Specification

## Overview

Refactor the knowledge tree viewer from a single-page recursive display to a per-node page model with breadcrumb navigation and a toggle-able tree drawer. This addresses disorientation when navigating large trees with multiple levels of expandable content.

## Current Problems

1. **Cognitive overload**: All nodes render inline with recursive expansion. Two levels of expand/collapse (children and details) on the same page makes it difficult to maintain context.

2. **No positional awareness**: When deep in a tree, there's no passive indicator of where you are in the overall structure without manually collapsing and re-expanding nodes.

3. **Competing UI affordances**: Chevrons for child expansion and chevrons for details expansion look similar, adding to the visual noise.

4. **Deep trees become unwieldy**: Trees with 4+ levels of nesting require significant horizontal space and mental tracking.

## Target Model

### URL Structure

```
/knowledge-trees/                     → Index of all trees
/knowledge-trees/history              → Root node of "history" tree
/knowledge-trees/history/great-war    → Child node "history.great-war"
/knowledge-trees/history/great-war/opening-salvo
                                      → Deeper node "history.great-war.opening-salvo"
```

Path segments joined with dots become the lookup key into `FlatKnowledgeTree`.

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Existing nav sidebar]  │  Content Area                         │
│                         │                                       │
│                         │  Breadcrumb: History > Great War      │
│                         │                        [View Tree 🌳] │
│                         │                                       │
│                         │  ┌─────────────────────────────────┐  │
│                         │  │ Node: Great War                 │  │
│                         │  │                                 │  │
│                         │  │ Description text here...        │  │
│                         │  │                                 │  │
│                         │  │ ▶ Details                       │  │
│                         │  │                                 │  │
│                         │  │ Placements:                     │  │
│                         │  │ • Hex 0405 (Hex)                │  │
│                         │  │ • The Broken Tower (Dungeon)    │  │
│                         │  │                                 │  │
│                         │  │ Children:                       │  │
│                         │  │ • Opening Salvo                 │  │
│                         │  │ • The Long Siege                │  │
│                         │  │ • Aftermath                     │  │
│                         │  └─────────────────────────────────┘  │
│                         │                                       │
└─────────────────────────────────────────────────────────────────┘
```

### Tree Drawer (toggled)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Nav sidebar]  │  Content Area              │  Tree Drawer      │
│                │                            │                   │
│                │  [dimmed/interactive]      │  History          │
│                │                            │  ├─ Origins       │
│                │                            │  ├─ ★ Great War   │
│                │                            │  │  ├─ Opening... │
│                │                            │  │  ├─ Long Siege │
│                │                            │  │  └─ Aftermath  │
│                │                            │  └─ Modern Era    │
│                │                            │                   │
│                │                            │  [×]              │
└─────────────────────────────────────────────────────────────────┘
```

- Current node marked with ★ or highlight
- Drawer auto-scrolls to reveal current node
- Click node to navigate
- Click outside or × to dismiss

## Implementation Requirements

### 1. Routing

Replace `[id].astro` with a catch-all route:

**File**: `apps/web/src/pages/gm-reference/knowledge-trees/[...path].astro`

```astro
---
import { getCollection } from 'astro:content';

import KnowledgeNodePage from '../../../components/KnowledgeNodePage.astro';
import SecretLayout from '../../../layouts/SecretLayout.astro';
import {
  buildPlacementMap,
  getFlatKnowledgeTree,
  getKnowledgeTree,
} from '../../../utils/knowledge-trees';

const { path } = Astro.params;
if (!path) {
  return Astro.redirect('/gm-reference/knowledge-trees');
}

const segments = path.split('/');
const treeId = segments[0];
const nodeKey = segments.join('.');

const tree = await getKnowledgeTree(treeId);
if (!tree) {
  throw new Error(`Unknown knowledge tree: ${treeId}`);
}

const flatTree = await getFlatKnowledgeTree(treeId);
if (!flatTree) {
  throw new Error(`Could not flatten tree: ${treeId}`);
}

const node = flatTree[nodeKey];
if (!node) {
  throw new Error(`Unknown node: ${nodeKey} in tree ${treeId}`);
}

// Build breadcrumb data
const breadcrumbs = segments.map((_, index) => {
  const key = segments.slice(0, index + 1).join('.');
  const breadcrumbNode = flatTree[key];
  return {
    key,
    name: breadcrumbNode?.name ?? key,
    path: `/gm-reference/knowledge-trees/${segments.slice(0, index + 1).join('/')}`,
  };
});

// Placement map (same as current)
const hexEntries = await getCollection('hexes');
// ... rest of collection fetching
const placementMap = buildPlacementMap(/* ... */);

// Get children for this node (need to derive from full tree)
const children = getChildrenForNode(tree, segments);
---

<SecretLayout title={`Knowledge: ${node.name}`}>
  <KnowledgeNodePage
    node={node}
    nodeKey={nodeKey}
    treeId={treeId}
    tree={tree}
    breadcrumbs={breadcrumbs}
    children={children}
    placementMap={placementMap}
  />
</SecretLayout>
```

### 2. Helper function for children lookup

Add to `apps/web/src/utils/knowledge-trees.ts`:

```typescript
/**
 * Navigate to a specific node in the tree by path segments and return its children.
 */
export function getChildrenForNode(
  tree: KnowledgeNodeData,
  segments: string[],
): KnowledgeNodeData[] {
  let current = tree;

  // Skip first segment (it's the tree root ID, which matches tree.id)
  for (let i = 1; i < segments.length; i++) {
    const child = current.children?.find((c) => c.id === segments[i]);
    if (!child) return [];
    current = child;
  }

  return current.children ?? [];
}

/**
 * Build ancestry chain for a node (for breadcrumbs).
 */
export function getAncestry(
  flatTree: FlatKnowledgeTree,
  nodeKey: string,
): Array<{ key: string; name: string }> {
  const segments = nodeKey.split('.');
  return segments.map((_, index) => {
    const key = segments.slice(0, index + 1).join('.');
    return {
      key,
      name: flatTree[key]?.name ?? key,
    };
  });
}
```

### 3. KnowledgeNodePage component

**File**: `apps/web/src/components/KnowledgeNodePage.astro`

```astro
---
import KnowledgeNodeContent from './KnowledgeNodeContent.svelte';
import KnowledgeTreeDrawer from './KnowledgeTreeDrawer.svelte';
import Breadcrumbs from './Breadcrumbs.astro';

import type { KnowledgeNodeData, PlacementMap } from '../types';

interface Props {
  node: KnowledgeNodeData;
  nodeKey: string;
  treeId: string;
  tree: KnowledgeNodeData;
  breadcrumbs: Array<{ key: string; name: string; path: string }>;
  children: KnowledgeNodeData[];
  placementMap: PlacementMap;
}

const { node, nodeKey, treeId, tree, breadcrumbs, children, placementMap } = Astro.props;
---

<div class="knowledge-node-page">
  <div class="page-header">
    <Breadcrumbs items={breadcrumbs} />
    <KnowledgeTreeDrawer
      client:load
      tree={tree}
      treeId={treeId}
      currentNodeKey={nodeKey}
    />
  </div>

  <KnowledgeNodeContent
    client:load
    node={node}
    nodeKey={nodeKey}
    children={children}
    placements={placementMap[nodeKey] ?? []}
  />
</div>

<style>
  .knowledge-node-page {
    max-width: 48rem;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
```

### 4. KnowledgeNodeContent component

**File**: `apps/web/src/components/KnowledgeNodeContent.svelte`

Extracts single-node rendering from existing `KnowledgeTree.svelte`:

```svelte
<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faChevronRight } from '@fortawesome/free-solid-svg-icons';

  import { renderBulletMarkdown } from '../utils/markdown.js';
  import { generateLink, generateLabelAppendix } from '../utils/placement-links.js';

  import type { KnowledgeNodeData, PlacementRef } from '../types.ts';

  interface Props {
    node: KnowledgeNodeData;
    nodeKey: string;
    children: KnowledgeNodeData[];
    placements: PlacementRef[];
  }

  let { node, nodeKey, children, placements }: Props = $props();

  let isDetailsExpanded = $state(false);
  let renderedDescription = $state('');
  let renderedDetails = $state('');

  $effect(() => {
    renderBulletMarkdown(node.description).then((html) => {
      renderedDescription = html;
    });
  });

  $effect(() => {
    if (node.details) {
      renderBulletMarkdown(node.details).then((html) => {
        renderedDetails = html;
      });
    }
  });

  function getChildPath(childId: string): string {
    const basePath = nodeKey.split('.').join('/');
    return `/gm-reference/knowledge-trees/${basePath}/${childId}`;
  }
</script>

<article class="node-content">
  <header>
    <h1>{node.name}</h1>
    {#if node.isUnlocked}
      <span class="unlocked-badge">✓ Unlocked</span>
    {/if}
  </header>

  <div class="description">
    {@html renderedDescription}
  </div>

  {#if node.details}
    <section class="details-section">
      <button
        class="details-toggle"
        onclick={() => (isDetailsExpanded = !isDetailsExpanded)}
      >
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
    </section>
  {/if}

  {#if !node.notPlaced}
    <section class="placements-section">
      <h2>Placements</h2>
      {#if placements.length > 0}
        <ul class="placement-list">
          {#each placements as ref}
            <li>
              <a href={generateLink(ref)}>{ref.label}</a>
              {generateLabelAppendix(ref)}
            </li>
          {/each}
        </ul>
      {:else}
        <p class="not-placed">❌ Not placed</p>
      {/if}
    </section>
  {/if}

  {#if children.length > 0}
    <section class="children-section">
      <h2>Children</h2>
      <ul class="children-list">
        {#each children as child}
          <li>
            <a href={getChildPath(child.id)}>{child.name}</a>
            {#if child.isUnlocked}
              <span class="unlocked-indicator">✓</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</article>

<style>
  .node-content {
    background: var(--bulma-scheme-main-bis);
    border-radius: 0.5rem;
    padding: 1.5rem;
  }

  header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  .unlocked-badge {
    background: var(--bulma-success);
    color: var(--bulma-success-invert);
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .description {
    margin-bottom: 1rem;
  }

  .details-section {
    margin-bottom: 1rem;
  }

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
    transition: transform 0.2s ease;
  }

  .details-toggle .chevron.rotated {
    transform: rotate(90deg);
  }

  .details-content {
    margin-top: 0.5rem;
    margin-left: 1.25rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--bulma-border);
  }

  h2 {
    font-size: 1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    color: var(--bulma-text-weak);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .placement-list,
  .children-list {
    margin: 0;
    padding-left: 1.25rem;
  }

  .placement-list li,
  .children-list li {
    margin: 0.25rem 0;
  }

  .not-placed {
    color: var(--bulma-danger);
    margin: 0;
  }

  .unlocked-indicator {
    color: var(--bulma-success);
    margin-left: 0.25rem;
  }
</style>
```

### 5. KnowledgeTreeDrawer component

**File**: `apps/web/src/components/KnowledgeTreeDrawer.svelte`

```svelte
<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faTree, faXmark } from '@fortawesome/free-solid-svg-icons';
  import { onMount } from 'svelte';

  import type { KnowledgeNodeData } from '../types.ts';

  interface Props {
    tree: KnowledgeNodeData;
    treeId: string;
    currentNodeKey: string;
  }

  let { tree, treeId, currentNodeKey }: Props = $props();

  let isOpen = $state(false);
  let drawerRef: HTMLElement;
  let currentNodeRef: HTMLElement;

  function toggle() {
    isOpen = !isOpen;
  }

  function close() {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && isOpen) {
      close();
    }
  }

  function handleClickOutside(event: MouseEvent) {
    if (isOpen && drawerRef && !drawerRef.contains(event.target as Node)) {
      close();
    }
  }

  $effect(() => {
    if (isOpen && currentNodeRef) {
      // Auto-scroll to current node after drawer opens
      setTimeout(() => {
        currentNodeRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  });

  function getNodePath(nodeKey: string): string {
    return `/gm-reference/knowledge-trees/${nodeKey.split('.').join('/')}`;
  }
</script>

<svelte:window on:keydown={handleKeydown} on:click={handleClickOutside} />

<button class="toggle-button" onclick={toggle} aria-label="View tree structure">
  <FontAwesomeIcon icon={faTree} />
  <span>View Tree</span>
</button>

{#if isOpen}
  <div class="drawer-backdrop" aria-hidden="true"></div>
  <aside class="drawer" bind:this={drawerRef}>
    <header class="drawer-header">
      <h2>Tree Structure</h2>
      <button class="close-button" onclick={close} aria-label="Close drawer">
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </header>
    <nav class="tree-nav">
      {@render treeNode(tree, tree.id, 0)}
    </nav>
  </aside>
{/if}

{#snippet treeNode(node: KnowledgeNodeData, nodeKey: string, depth: number)}
  {@const isCurrent = nodeKey === currentNodeKey}
  <div
    class="tree-node"
    class:current={isCurrent}
    style="padding-left: {depth * 1}rem"
    bind:this={isCurrent ? currentNodeRef : null}
  >
    <a href={getNodePath(nodeKey)} class:current={isCurrent}>
      {#if isCurrent}★{/if}
      {node.name}
      {#if node.isUnlocked}
        <span class="unlocked">✓</span>
      {/if}
    </a>
  </div>
  {#if node.children}
    {#each node.children as child}
      {@render treeNode(child, `${nodeKey}.${child.id}`, depth + 1)}
    {/each}
  {/if}
{/snippet}

<style>
  .toggle-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: var(--bulma-scheme-main-bis);
    border: 1px solid var(--bulma-border);
    border-radius: 0.375rem;
    cursor: pointer;
    color: var(--bulma-text);
    font-size: 0.875rem;
  }

  .toggle-button:hover {
    background: var(--bulma-scheme-main-ter);
  }

  .drawer-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 40;
  }

  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 20rem;
    max-width: 90vw;
    background: var(--bulma-scheme-main);
    border-left: 1px solid var(--bulma-border);
    z-index: 50;
    display: flex;
    flex-direction: column;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem;
    border-bottom: 1px solid var(--bulma-border);
  }

  .drawer-header h2 {
    margin: 0;
    font-size: 1rem;
  }

  .close-button {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem;
    color: var(--bulma-text-weak);
  }

  .close-button:hover {
    color: var(--bulma-text);
  }

  .tree-nav {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .tree-node {
    margin: 0.125rem 0;
  }

  .tree-node a {
    display: block;
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    color: var(--bulma-text);
    text-decoration: none;
  }

  .tree-node a:hover {
    background: var(--bulma-scheme-main-bis);
  }

  .tree-node a.current {
    background: var(--bulma-primary);
    color: var(--bulma-primary-invert);
    font-weight: 600;
  }

  .unlocked {
    color: var(--bulma-success);
    margin-left: 0.25rem;
  }

  .tree-node a.current .unlocked {
    color: var(--bulma-success-light);
  }
</style>
```

### 6. Breadcrumbs component

**File**: `apps/web/src/components/Breadcrumbs.astro`

```astro
---
interface BreadcrumbItem {
  key: string;
  name: string;
  path: string;
}

interface Props {
  items: BreadcrumbItem[];
}

const { items } = Astro.props;
---

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    <li>
      <a href="/gm-reference/knowledge-trees">Knowledge Trees</a>
    </li>
    {items.map((item, index) => (
      <li>
        <span class="separator">›</span>
        {index === items.length - 1 ? (
          <span class="current" aria-current="page">{item.name}</span>
        ) : (
          <a href={item.path}>{item.name}</a>
        )}
      </li>
    ))}
  </ol>
</nav>

<style>
  .breadcrumbs ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .breadcrumbs li {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .separator {
    color: var(--bulma-text-weak);
  }

  .breadcrumbs a {
    color: var(--bulma-link);
    text-decoration: none;
  }

  .breadcrumbs a:hover {
    text-decoration: underline;
  }

  .current {
    color: var(--bulma-text);
    font-weight: 500;
  }
</style>
```

## Migration Notes

### Preserve existing functionality

The `Unlocks.svelte` component and other code that references knowledge trees via `FlatKnowledgeTree` lookups should continue to work unchanged. The data layer is identical; only the viewer is refactored.

### Route redirects

Consider adding a redirect from the old URL pattern if needed:

```
/gm-reference/knowledge-trees/history → still works (root node)
```

Child nodes that were previously accessed via anchor scrolling or expand state will now have direct URLs.

### Expand/collapse state

The per-node page model eliminates the need for `knowledgeTreeExpanded` store for children (children are now links). The `knowledgeTreeDetails` store can be simplified to just track details expansion on the current page, or removed entirely if details are always visible or use local component state.

## Testing Checklist

After implementation, verify:

- [ ] Root tree page (`/knowledge-trees/history`) displays root node correctly
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

## Optional Enhancements (not required)

1. **Keyboard navigation in drawer**: Arrow keys to traverse tree
2. **Expand/collapse subtrees in drawer**: For very large trees
3. **"Parent" and "Next/Previous sibling" navigation**: Quick nav links on node page
4. **Search within tree**: Filter nodes in drawer by name
5. **Print view**: Render full tree inline for printing/export
