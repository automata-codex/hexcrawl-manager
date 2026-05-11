<script lang="ts">
  import {
    initBooleanFilterFromUrl,
    setBooleanUrlParam,
  } from '../utils/url-filter-state';

  import NpcListRow from './NpcListRow.svelte';
  import type { NpcListItem } from './npc-list-types';

  interface Props {
    npcs: NpcListItem[];
  }

  const { npcs }: Props = $props();

  const hasInactives = $derived(
    npcs.some((n) => n.campaignStatus === 'inactive'),
  );

  let showInactive = $state(initBooleanFilterFromUrl('show-inactive'));

  $effect(() => {
    setBooleanUrlParam('show-inactive', showInactive);
  });

  const visible = $derived(() =>
    npcs.filter((n) => n.campaignStatus !== 'inactive' || showInactive),
  );
</script>

{#if hasInactives}
  <label class="checkbox show-inactive">
    <input type="checkbox" bind:checked={showInactive} />
    Show inactive
  </label>
{/if}

<ul class="npc-list">
  {#each visible() as npc (npc.id)}
    <li class="npc-item">
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
</style>
