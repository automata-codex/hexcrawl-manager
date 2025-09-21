<script lang="ts">
  import { getFloatingCluePath } from '../../config/routes.ts';

  import type { ClueLink } from '../../types.ts';

  export let hexId: string;
  export let clueLinks: ClueLink[];

  type ClueData = {
    clueId: string;
    name: string;
    score: number;
    summary: string;
  }

  // Build a lookup map: hexId -> [clues]
  const hexToClues: Record<string, ClueData[]> = {};

  for (const clue of clueLinks) {
    for (const link of clue.linkedHexes) {
      if (!hexToClues[link.hexId]) {
        hexToClues[link.hexId] = [];
      }
      hexToClues[link.hexId].push({
        clueId: clue.clueId,
        name: clue.name,
        score: link.score,
        summary: clue.summary,
      });
    }
  }

  const cluesForThisHex = [...hexToClues[hexId] ?? []].sort((a, b) => b.score - a.score);
</script>

{#if cluesForThisHex.length > 0}
  <section class="floating-clues">
    <p class="inline-heading">Floating Clues:</p>
    <ul>
      {#each cluesForThisHex as clue (clue.clueId)}
        <li>
          <a href={getFloatingCluePath(clue.clueId)}>{clue.name}</a>
          <span class="score">({(clue.score * 100).toFixed(1)}% match)</span>
          <span>{clue.summary}</span>
        </li>
      {/each}
    </ul>
  </section>
{/if}
