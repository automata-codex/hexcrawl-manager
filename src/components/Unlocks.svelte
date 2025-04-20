<script lang="ts">
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
</script>

{#if unlocks.length > 0}
  <section class="knowledge-unlocks">
    <h2>Knowledge Unlocked</h2>
    <ul>
      {#each unlocks as key}
        {@const node = resolveNode(key)}
        {#if node}
          <li>
            <strong>{node.name}</strong><br />
            <span class="text-muted">{node.description}</span>
          </li>
        {:else}
          <li><em>Unknown knowledge key:</em> {key}</li>
        {/if}
      {/each}
    </ul>
  </section>
{/if}
