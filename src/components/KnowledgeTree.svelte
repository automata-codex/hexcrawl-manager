<script lang="ts">
  import { faChevronRight } from '@fortawesome/pro-light-svg-icons'
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import type { KnowledgeNodeData, PlacementRef } from '../types';
  import { getDungeonPath, getHexPath } from '../utils/routes.js';

  export let node: KnowledgeNodeData;
  export let fullId: string = node.id;
  export let placementMap: Record<string, PlacementRef[]> = {};

  let isExpanded = true;

  function generateLink(ref: PlacementRef): string {
    switch (ref.type) {
      case 'dungeon':
        return getDungeonPath(ref.id);
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
      case 'hex':
        return '(Landmark)';
      case 'hidden-site':
        return `(Hidden Site)`;
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }
</script>
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
</style>
<div class:heading={node.children?.length}>
  <div style="display: flex">
    {#if node.children?.length}
      <button on:click={() => (isExpanded = !isExpanded)}>
        <span class="chevron" class:rotated={isExpanded}>
          <FontAwesomeIcon icon={faChevronRight} />
        </span>
      </button>
    {/if}
    {#if !node.children?.length}
      <ul>
        <li>
          <span class="leaf-node-name" class:unused={!placementMap[fullId]?.length}>{node.name}:{' '}</span>
          <span class="node-description">{node.description}</span>
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
        <svelte:self node={child} fullId={`${fullId}.${child.id}`} {placementMap} />
      {/each}
    </div>
  {/if}
</div>
