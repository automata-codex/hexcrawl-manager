<script lang="ts">
  import { sortIgnoringArticles } from '@achm/core';
  import { normalizeClueRef, type ClueReference } from '@achm/schemas';

  import { getCluePath } from '../../config/routes.ts';

  import type { ClueMapEntry } from '../../types.ts';

  interface Props {
    /** Raw clue references (string id or { id, context }) from a hex sub-structure. */
    clues?: ClueReference[];
    clueMap?: Record<string, ClueMapEntry>;
  }

  const { clues, clueMap = {} }: Props = $props();

  const resolved = $derived(
    (clues ?? [])
      .map((ref) => {
        const { id, context } = normalizeClueRef(ref);
        return {
          id,
          name: clueMap?.[id]?.name ?? id,
          found: !!clueMap?.[id],
          context,
        };
      })
      .sort((a, b) => sortIgnoringArticles(a.name, b.name)),
  );
</script>

{#if resolved.length > 0}
  <p>
    <strong>Clues:</strong>
    {#each resolved as clue, i (clue.id)}
      {#if clue.found}
        <a href={getCluePath(clue.id)}>{clue.name}</a>
      {:else}
        <span class="has-text-danger">{clue.name} (not found)</span>
      {/if}{#if clue.context}<em class="clue-context">({clue.context})</em>
      {/if}{#if i < resolved.length - 1},{' '}{/if}
    {/each}
  </p>
{/if}

<style>
  .clue-context {
    font-style: italic;
    color: var(--bulma-text-weak);
  }
</style>
