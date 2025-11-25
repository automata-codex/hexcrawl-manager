<script lang="ts">
  import { faChevronRight } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import {
    getDungeonPath,
    getFloatingCluePath,
    getHexPath,
  } from '../config/routes.js';
  import { renderBulletMarkdown } from '../utils/markdown.js';

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
        return `(Hidden Site)`;
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }
</script>

<div class:heading={node.children?.length}>
  <div style="display: flex">
    {#if node.children?.length}
      <button onclick={() => (isExpanded = !isExpanded)}>
        <span class="chevron" class:rotated={isExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
      </button>
    {/if}
    {#if !node.children?.length}
      <ul>
        <li>
          <span
            class="leaf-node-name"
            class:unused={!placementMap[fullId]?.length}>{node.name}:{' '}</span
          >
          <span class="node-description">{node.description}</span>
          {#if node.details}
            <div class="node-details">
              <button onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
                <span class="chevron" class:rotated={isDetailsExpanded}>
                  <FontAwesomeIcon icon={faChevronRight} />
                </span>
                Details
              </button>
              {#if isDetailsExpanded}
                <p>{@html renderedDetails}</p>
              {/if}
            </div>
          {/if}
          {#if placementMap[fullId]?.length}
            <ul>
              {#each placementMap[fullId] as ref}
                <li>
                  <a href={generateLink(ref)}>{ref.label}</a>
                  {' '}
                  {generateLabelAppendix(ref)}
                </li>
              {/each}
            </ul>
          {:else}
            <ul><li>❌ Not placed</li></ul>
          {/if}
        </li>
      </ul>
    {:else}
      <div>
        <span class="parent-node-text">
          <span class="leaf-node-name">{node.name}:</span>
          {' '}
          {node.description}
        </span>
        {#if node.details}
          <div class="node-details">
            <button onclick={() => (isDetailsExpanded = !isDetailsExpanded)}>
              <span class="chevron" class:rotated={isDetailsExpanded}>
                <FontAwesomeIcon icon={faChevronRight} />
              </span>
              Details
            </button>
            {#if isDetailsExpanded}
              <p>{@html renderedDetails}</p>
            {/if}
          </div>
        {/if}
        {#if placementMap[fullId]?.length}
          <ul>
            {#each placementMap[fullId] as ref}
              <li>
                <a href={generateLink(ref)}>{ref.label}</a>
                {' '}
                {generateLabelAppendix(ref)}
              </li>
            {/each}
          </ul>
        {:else if !node.children?.length}
          <ul><li>❌ Not placed</li></ul>
        {/if}
      </div>
    {/if}
  </div>

  {#if isExpanded && node.children?.length}
    <div style="margin-left: 1.5em;">
      {#each node.children as child}
        <svelte:self
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
    transition: transform 0.2s ease;
  }

  .leaf-node-name {
    font-weight: bold;
  }

  .parent-node-text {
    color: var(--bulma-strong-color);
  }

  .unused {
    color: var(--bulma-strong-color);
  }

  .node-details {
  }

  .node-details button {
    display: inline-flex;
    align-items: center;
    gap: 0.5em;
    background: none;
    border: none;
    font-size: 0.9em;
    padding: 0;
    cursor: pointer;
    color: var(--bulma-text);
  }

  .node-details p {
    margin: 0.25em 0 0 1.5em;
  }
</style>
