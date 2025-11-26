<script lang="ts">
  import { getKnowledgeTreePath } from '../config/generated/routes.js';

  import type { FlatKnowledgeTree } from '../types.ts';

  interface Props {
    knowledgeTrees: Record<string, FlatKnowledgeTree>;
    unlocks: string[];
  }

  const { knowledgeTrees, unlocks }: Props = $props();

  function resolveNode(key: string) {
    const [root] = key.split('.');
    return knowledgeTrees[root]?.[key];
  }

  function getTreeRoot(key: string): string {
    return key.split('.')[0];
  }
</script>

{#if unlocks.length > 0}
  <section class="knowledge-unlocks">
    <p class="inline-heading">Knowledge Unlocked:</p>
    <ul>
      {#each unlocks as key (key)}
        {@const node = resolveNode(key)}
        {#if node}
          <li>
            <span class="inline-heading">{node.name}</span>:
            <span class="text-muted">{node.description}</span>
            <a href={getKnowledgeTreePath(getTreeRoot(key))}>[Tree]</a>
          </li>
        {:else}
          <li><em>Unknown knowledge key:</em> {key}</li>
        {/if}
      {/each}
    </ul>
  </section>
{/if}
