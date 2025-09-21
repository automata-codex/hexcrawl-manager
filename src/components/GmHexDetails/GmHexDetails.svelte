<script lang="ts">
  import { getHexPath, getRegionPath } from '../../config/routes.ts';
  import { getRegionTitle } from '../../utils/regions.ts';

  import Dungeon from './Dungeon.svelte';
  import Explored from './Explored.svelte';
  import HiddenSites from './HiddenSites.svelte';
  import Landmark from './Landmark.svelte';
  import LinkedClues from './LinkedClues.svelte';
  import Neighbors from './Neighbors.svelte';
  import Visited from './Visited.svelte';

  import type { ClueLink, DungeonEntry, ExtendedHexData, FlatKnowledgeTree } from '../../types.ts';

  interface Props {
    clueLinks?: ClueLink[];
    dungeons: DungeonEntry[];
    hex: ExtendedHexData;
    knowledgeTrees: Record<string, FlatKnowledgeTree>;
    showSelfLink?: boolean;
  }

  const {
    clueLinks,
    dungeons,
    hex,
    knowledgeTrees,
    showSelfLink = true,
  }: Props = $props();
</script>
<style>
    .data-bar {
        display: flex;
        font-weight: bold;
    }

    :global(.data-bar-cell) {
        margin-right: 1rem;
    }

    .updates {
        padding: 1rem;
        margin: 1rem 0;
    }

    .updates ul {
        padding-left: 1rem;
    }

    .warning {
        background-color: var(--bulma-danger);
        color: var(--bulma-white);
        font-weight: bold;
        padding: 1rem;
        text-align: center;
        margin: 0 0 1rem;
    }
</style>
{#if hex.updates}
  <div class="box updates">
    <p class="warning">⚠️ Updates ⚠️</p>
    <ul>
      {#each hex.renderedUpdates as update}
        <li>{@html update}</li>
      {/each}
    </ul>
  </div>
{/if}
<div class="data-bar">
  <Visited {hex} />
  <Explored {hex} />
  {#if showSelfLink}
    <div class="data-bar-cell">
      <a href={getHexPath(hex.id)}>View Hex</a>
    </div>
  {/if}
  <div class="data-bar-cell">
    <a href={getRegionPath(hex.regionId)}>{getRegionTitle(hex.regionId)}</a>
  </div>
  <Dungeon {dungeons} {hex} />
</div>
<div class="data-bar">
  <Neighbors {hex} />
</div>
<Landmark {hex} {knowledgeTrees} />
<HiddenSites {hex} {knowledgeTrees} />
{#if hex.secretSite}
  <div class="hanging-indent">
    <span class="inline-heading">Secret Site:</span>{' '}
    {@html hex.renderedSecretSite}
  </div>
{/if}
{#if hex.notes}
  <p class="hanging-indent">
    <span class="inline-heading">GM&rsquo;s Notes:</span>
  </p>
  <ul>
  {#each hex.renderedNotes as note}
    <li>{@html note}</li>
  {/each}
  </ul>
{/if}
{#if clueLinks}
  <LinkedClues {clueLinks} hexId={hex.id} />
{/if}
