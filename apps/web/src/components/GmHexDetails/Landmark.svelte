<script lang="ts">
  import { getCluePath } from '../../config/routes.ts';

  import type { ClueMapEntry, ExtendedHexData } from '../../types.ts';

  interface Props {
    clueMap?: Record<string, ClueMapEntry>;
    hex: ExtendedHexData;
  }

  const { clueMap = {}, hex }: Props = $props();
  // TODO Handle a treasure entry in the landmark data structure

  // Get clue display data
  const landmarkClues = typeof hex.landmark !== 'string' && hex.landmark.clues
    ? hex.landmark.clues.map((id) => ({
        id,
        name: clueMap?.[id]?.name ?? id,
        found: !!clueMap?.[id],
      }))
    : [];
</script>

<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>
  {@html hex.renderedLandmark}
  {#if landmarkClues.length > 0}
    <p style="margin-left: 1rem">
      <strong>Clues:</strong>
      {#each landmarkClues as clue, i (i)}
        {#if clue.found}
          <a href={getCluePath(clue.id)}>{clue.name}</a>
        {:else}
          <span class="has-text-danger">{clue.name} (not found)</span>
        {/if}{#if i < landmarkClues.length - 1},{' '}{/if}
      {/each}
    </p>
  {/if}
</div>
