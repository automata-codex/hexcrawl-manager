<script lang="ts">
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
        return '';
      case 'hex':
        return '(Landmark)';
      case 'hidden-site':
        return `(Hidden Site)`;
      default:
        throw new Error(`Unknown reference type: ${ref.type}`);
    }
  }
</script>

<div>
  <div style="display: flex">
    {#if node.children?.length}
      <button on:click={() => (isExpanded = !isExpanded)}>
        {isExpanded ? '▼' : '▶'}
      </button>
    {/if}
    <div>
      <strong>{node.name}</strong>
      <small>{node.description}</small>
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
        <span>❌ Not placed</span>
      {/if}
    </div>
  </div>

  {#if isExpanded && node.children?.length}
    <div style="margin-left: 1.5em;">
      {#each node.children as child}
        <svelte:self node={child} fullId={`${fullId}.${child.id}`} {placementMap} />
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
    }
</style>
