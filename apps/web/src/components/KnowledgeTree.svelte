<script lang="ts">
  import { faChevronRight } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import {
    getDungeonPath,
    getFloatingCluePath,
    getHexPath,
  } from '../config/routes.js';
  import { renderBulletMarkdown } from '../utils/markdown.js';

  import KnowledgeTree from './KnowledgeTree.svelte';

  import type { PlacementRef } from '../types';
  import type { KnowledgeNodeData } from '@skyreach/schemas';

  interface Props {
    node: KnowledgeNodeData;
    fullId?: string;
    placementMap?: Record<string, PlacementRef[]>;
  }

  let { node, fullId = node.id, placementMap = {} }: Props = $props();

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
      case 'floating-clue':
        return getFloatingCluePath(ref.id);
      case 'hex':
        return getHexPath(ref.id);
      case 'hidden-site':
        return getHexPath(ref.id);
      case 'pointcrawl-node':
        // TODO: Add getPointcrawlNodePath when available
        return '#';
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }

  function generateLabelAppendix(ref: PlacementRef): string {
    switch (ref.type) {
      case 'dungeon':
        return '(Dungeon)';
      case 'floating-clue':
        return '(Floating Clue)';
      case 'hex':
        return '(Landmark)';
      case 'hidden-site':
        return '(Hidden Site)';
      case 'pointcrawl-node':
        return '(Pointcrawl)';
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }
</script>

<div class:heading={node.children?.length}>
  <div style="display: flex; align-items: flex-start">
    {#if node.children?.length}
      <button onclick={() => (isExpanded = !isExpanded)}>
        <span class="chevron" class:rotated={isExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
      </button>
    {/if}
    {#if !node.children?.length}
      <ul class="leaf-node">
        <li>
          <span
            class="leaf-node-name"
            class:unused={!placementMap[fullId]?.length}>{node.name}:{' '}</span
          >
          <span class="node-description">{node.description}</span>
          {#if node.isUnlocked}
            <span class="unlocked-indicator">✓ Unlocked</span>
          {/if}
          {#if node.details}
            <div class="node-details">
              <button onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
                <span class="chevron" class:rotated={isDetailsExpanded}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </span>
                <strong>Details</strong>
              </button>
              {#if isDetailsExpanded}
                <div class="details-text-container">{@html renderedDetails}</div>
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
          {:else}
            <ul class="placement-list"><li>❌ Not placed</li></ul>
          {/if}
        </li>
      </ul>
    {:else}
      <div class="node-content">
        <span class="parent-node-text">
          <span class="leaf-node-name">{node.name}:</span>
          {' '}
          {node.description}
          {#if node.isUnlocked}
            <span class="unlocked-indicator">✓ Unlocked</span>
          {/if}
        </span>
        {#if node.details}
          <div class="node-details">
            <button onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
              <span class="chevron" class:rotated={isDetailsExpanded}>
                <FontAwesomeIcon icon={faChevronRight} />
              </span>
              <strong>Details</strong>
            </button>
            {#if isDetailsExpanded}
              <div class="details-text-container">{@html renderedDetails}</div>
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
          <ul class="placement-list"><li>❌ Not placed</li></ul>
        {/if}
      </div>
    {/if}
  </div>

  {#if isExpanded && node.children?.length}
    <div style="margin-left: 1.5em;">
      {#each node.children as child}
        <KnowledgeTree
          node={child}
          fullId={`${fullId}.${child.id}`}
          {placementMap}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  button {
    background: none;
    border: none;
    font-size: 1em;
    padding: 0;
    cursor: pointer;
    width: 1.5em;
  }

  span.rotated {
    display: inline-block;
    transform: rotate(90deg);
    transition: transform 0.2s ease;
  }

  span.chevron {
    display: inline-block;
    width: 1em;
    text-align: center;
    transition: transform 0.2s ease;
  }

  .details-text-container {
    padding-left: 1.5rem;
  }

  :global(.details-text-container p) {
      margin-top: 1rem;
    }

  :global(.details-text-container p:first-child) {
      margin-top: 0;
    }

  .leaf-node {
    padding-inline-start: 1.5rem;
    margin-bottom: 0;
  }

  .leaf-node-name {
    color: var(--bulma-strong-color);
    font-weight: bold;
  }

  .node-content {
    flex: 1;
    min-width: 0;
  }

  .placement-list {
    padding-inline-start: 1.5rem;
  }

  .unused {
    color: var(--bulma-strong-color);
  }

  .node-details {
    display: block;
  }

  .node-details button {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    color: var(--bulma-text);
    width: auto;
  }

  .node-details button .chevron {
    width: 1em;
    text-align: center;
  }

  .unlocked-indicator {
    color: var(--bulma-success);
    margin-left: 0.5em;
  }
</style>
