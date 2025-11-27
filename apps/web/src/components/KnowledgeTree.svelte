<script lang="ts">
  import { faChevronRight } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import {
    getDungeonPath,
    getEncounterPath,
    getFloatingCluePath,
    getHexPath,
    getPointcrawlEdgePath,
    getPointcrawlNodePath,
    getPointcrawlPath,
  } from '../config/routes.js';
  import { renderBulletMarkdown } from '../utils/markdown.js';

  import KnowledgeTree from './KnowledgeTree.svelte';

  import type { PlacementRef } from '../types';
  import type { KnowledgeNodeData } from '@skyreach/schemas';

  interface Props {
    node: KnowledgeNodeData;
    fullId?: string;
    placementMap?: Record<string, PlacementRef[]>;
    depth?: number;
  }

  let { node, fullId = node.id, placementMap = {}, depth = 0 }: Props = $props();

  let isExpanded = $state(true);
  let isDetailsExpanded = $state(false);
  let renderedDetails = $state('');

  $effect(() => {
    if (node.details) {
      renderBulletMarkdown(node.details).then((html) => {
        renderedDetails = html;
      });
    }
  });

  function generateLink(ref: PlacementRef): string {
    switch (ref.type) {
      case 'dungeon':
        return getDungeonPath(ref.id);
      case 'encounter':
        return getEncounterPath(ref.id);
      case 'floating-clue':
        return getFloatingCluePath(ref.id);
      case 'hex':
        return getHexPath(ref.id);
      case 'hidden-site':
        return getHexPath(ref.id);
      case 'pointcrawl':
        return getPointcrawlPath(ref.id);
      case 'pointcrawl-node':
        return getPointcrawlNodePath(ref.id);
      case 'pointcrawl-edge':
        return getPointcrawlEdgePath(ref.id);
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }

  function generateLabelAppendix(ref: PlacementRef): string {
    switch (ref.type) {
      case 'dungeon':
        return '(Dungeon)';
      case 'encounter':
        return '(Encounter)';
      case 'floating-clue':
        return '(Floating Clue)';
      case 'hex':
        return '(Landmark)';
      case 'hidden-site':
        return '(Hidden Site)';
      case 'pointcrawl':
        return '(Pointcrawl)';
      case 'pointcrawl-node':
        return '(Pointcrawl Node)';
      case 'pointcrawl-edge':
        return '(Pointcrawl Edge)';
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }
</script>

<div class="node-row" style="padding-left: {depth * 1.5}rem">
  <div class="icon-column">
    {#if node.children?.length}
      <button onclick={() => (isExpanded = !isExpanded)}>
        <span class="chevron" class:rotated={isExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
      </button>
    {:else}
      <span class="bullet">●</span>
    {/if}
  </div>
  <div class="content-column">
    <span class="node-name" class:unused={!node.children?.length && !placementMap[fullId]?.length}
      >{node.name}:</span
    >
    {' '}
    <span class="node-description">{node.description}</span>
    {#if node.isUnlocked}
      <span class="unlocked-indicator">✓ Unlocked</span>
    {/if}
    {#if node.details}
      <div class="details-section">
        <button class="details-toggle" onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
          <span class="chevron" class:rotated={isDetailsExpanded}>
            <FontAwesomeIcon icon={faChevronRight} />
          </span>
          <strong>Details</strong>
        </button>
        {#if isDetailsExpanded}
          <div class="details-content">{@html renderedDetails}</div>
        {/if}
      </div>
    {/if}
    {#if placementMap[fullId]?.length}
      <ul class="placement-list">
        {#each placementMap[fullId] as ref}
          <li>
            <a href={generateLink(ref)}>{ref.label}</a>
            {' '}
            {generateLabelAppendix(ref)}
          </li>
        {/each}
      </ul>
    {:else if !node.children?.length}
      <span class="not-placed">❌ Not placed</span>
    {/if}
  </div>
</div>

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

<style>
  /* Layout structure */
  .node-row {
    display: flex;
    align-items: flex-start;
  }

  .icon-column {
    width: 1.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 0.1em;
  }

  .icon-column button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    font-size: 1em;
  }

  .icon-column .bullet {}

  .content-column {
    flex: 1;
    min-width: 0;
  }

  .children-container {
    /* No margin-left — depth-based padding handles indentation */
  }

  /* Chevron animation */
  span.chevron {
    display: inline-block;
    width: 1em;
    text-align: center;
    transition: transform 0.2s ease;
  }

  span.rotated {
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
  }

  /* Node content styling */
  .node-name {
    color: var(--bulma-strong-color);
    font-weight: bold;
  }

  .unused {}

  .unlocked-indicator {
    color: var(--bulma-success);
    margin-left: 0.5em;
  }

  /* Details section - indented to align with child nodes */
  .details-section {
    display: block;
    margin-left: 1.5rem;
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
    font-size: 0.85em;
  }

  .details-content {
    margin-left: 1.125rem;
    margin-bottom: 1rem;
  }

  :global(.details-content p) {
    margin-top: 1rem;
  }

  :global(.details-content p:first-child) {
    margin-top: 0;
  }

  /* Placement list */
  .placement-list {
    list-style: disc;
    margin: 0.25rem 0 0 1.25rem;
    padding: 0;
  }

  .placement-list li {
    margin: 0.125rem 0;
  }

  .not-placed {
    display: block;
    margin-top: 0.25rem;
  }
</style>
