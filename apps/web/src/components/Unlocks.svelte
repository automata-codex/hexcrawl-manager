<script lang="ts">
  import { getKnowledgeNodePath } from '../config/routes.js';
  import { renderBulletMarkdown } from '../utils/markdown.js';

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
    <p class="inline-heading">Knowledge Unlocked:</p>
    <ul>
      {#each unlocks as key (key)}
        {@const node = resolveNode(key)}
        {#if node}
          <li>
            <span class="inline-heading">{node.name}</span>:
            {#await renderBulletMarkdown(node.description) then html}
              <span class="text-muted">{@html html}</span>
            {/await}
            <a href={getKnowledgeNodePath(key)}>[KT Node]</a>
          </li>
        {:else}
          <li><em>Unknown knowledge key:</em> {key}</li>
        {/if}
      {/each}
    </ul>
  </section>
{/if}
