<script lang="ts">
  import type { ClueLink } from '../../types.ts';
  import { getFloatingCluePath } from '../../utils/routes.ts';

  export let hexId: string;
  export let clueLinks: ClueLink[];

  // Build a lookup map: hexId -> [clues]
  const hexToClues: Record<string, { clueId: string; score: number }[]> = {};

  for (const clue of clueLinks) {
    for (const link of clue.linkedHexes) {
      if (!hexToClues[link.hexId]) {
        hexToClues[link.hexId] = [];
      }
      hexToClues[link.hexId].push({
        clueId: clue.clueId,
        score: link.score,
      });
    }
  }

  const cluesForThisHex = hexToClues[hexId] ?? [];
</script>

{#if cluesForThisHex.length > 0}
  <section class="floating-clues">
    <p class="inline-heading">Floating Clues:</p>
    <ul>
      {#each cluesForThisHex as { clueId, score }}
        <li>
          <a href={getFloatingCluePath(clueId)}>{clueId.replace(/-/g, ' ')}</a>
          <span class="score">({(score * 100).toFixed(1)}% match)</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}
