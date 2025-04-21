<script lang="ts">
  import type { KnowledgeNodeData } from '../types';

  export let node: KnowledgeNodeData;
  export let fullId: string = node.id;
  export let placementMap: Record<string, string[]> = {}; // maps knowledge keys to lists of locations

  let isExpanded = true;
</script>

<div>
  <div>
    {#if node.children?.length}
      <button on:click={() => (isExpanded = !isExpanded)}>
        {isExpanded ? '▼' : '▶'}
      </button>
    {/if}
    <div>
      <strong>{node.name}</strong><br />
      <small>{node.description}</small>
      {#if placementMap[fullId]?.length}
        <ul>
          {#each placementMap[fullId] as ref}
            <li>🔗 {ref}</li>
          {/each}
        </ul>
      {:else}
        <div>❌ Not placed</div>
      {/if}
    </div>
  </div>

  {#if isExpanded && node.children?.length}
    <div>
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
