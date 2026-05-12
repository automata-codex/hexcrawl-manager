<script lang="ts">
  import {
    initBooleanFilterFromUrl,
    setBooleanUrlParam,
  } from '../utils/url-filter-state';

  import NpcListRow from './NpcListRow.svelte';
  import type { NpcListItem } from './npc-list-types';

  interface Props {
    npcs: NpcListItem[];
    /** URL query-param key for the show-inactive toggle.
     * Override when multiple instances render on the same page. */
    urlKey?: string;
  }

  let { npcs, urlKey = 'show-inactive' }: Props = $props();

  let showInactive = $state(initBooleanFilterFromUrl(urlKey));

  const hasInactives = $derived(
    npcs.some((n) => n.campaignStatus === 'inactive'),
  );

  $effect(() => {
    setBooleanUrlParam(urlKey, showInactive);
  });
</script>

{#if hasInactives}
  <label class="checkbox show-inactive">
    <input type="checkbox" bind:checked={showInactive} />
    Show inactive
  </label>
{/if}

<ul class="npc-list">
  {#each npcs as npc (npc.id)}
    <li
      class="npc-item"
      class:hidden={npc.campaignStatus === 'inactive' && !showInactive}
    >
      <NpcListRow {npc} />
    </li>
  {/each}
</ul>

<style>
  .show-inactive {
    display: inline-block;
    margin-bottom: 0.75rem;
    font-size: 0.875rem;
  }

  .npc-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .npc-item {
    margin: 0;
  }

  .npc-item.hidden {
    display: none;
  }
</style>
