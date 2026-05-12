<script lang="ts">
  import {
    initBooleanFilterFromUrl,
    initFilterFromUrl,
    setBooleanUrlParam,
    setUrlParam,
  } from '../utils/url-filter-state';

  import NpcListRow from './NpcListRow.svelte';
  import type { NpcListItem } from './npc-list-types';

  interface FilterOptions {
    factions: string[];
    plotlines: string[];
  }

  interface Props {
    npcs: NpcListItem[];
    filterOptions: FilterOptions;
    factionNames: Record<string, string>;
    plotlineNames: Record<string, string>;
    /** When false, the faction and plotline filters are hidden and their
     *  URL state is ignored — those affiliations are GM-only knowledge. */
    isGm: boolean;
  }

  const {
    npcs,
    filterOptions,
    factionNames,
    plotlineNames,
    isGm,
  }: Props = $props();

  let searchQuery = $state(initFilterFromUrl('q'));
  let factionFilter = $state(isGm ? initFilterFromUrl('faction') : '');
  let plotlineFilter = $state(isGm ? initFilterFromUrl('plotline') : '');
  let showInactive = $state(initBooleanFilterFromUrl('show-inactive'));

  $effect(() => {
    setUrlParam('q', searchQuery);
  });
  $effect(() => {
    if (isGm) setUrlParam('faction', factionFilter);
  });
  $effect(() => {
    if (isGm) setUrlParam('plotline', plotlineFilter);
  });
  $effect(() => {
    setBooleanUrlParam('show-inactive', showInactive);
  });

  // `filtered` intentionally does NOT apply the `showInactive` toggle —
  // inactive NPCs stay in the list and groups, and are hidden via CSS on
  // the `<li>` instead. Filtering by show-inactive used to cause Svelte's
  // keyed each to reorder items, which triggered a runtime bug where the
  // moved `<img>` kept the previous item's `src`.
  const filtered = $derived(() => {
    const query = searchQuery.trim().toLowerCase();
    return npcs.filter((npc) => {
      if (query) {
        const hay = `${npc.displayName}\n${npc.sortKey}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (factionFilter) {
        if (factionFilter === '__none__') {
          if (npc.factions.length > 0) return false;
        } else if (!npc.factions.includes(factionFilter)) {
          return false;
        }
      }
      if (plotlineFilter) {
        if (plotlineFilter === '__none__') {
          if (npc.plotlines.length > 0) return false;
        } else if (!npc.plotlines.includes(plotlineFilter)) {
          return false;
        }
      }
      return true;
    });
  });

  const visibleCount = $derived(
    () =>
      filtered().filter(
        (npc) => npc.campaignStatus !== 'inactive' || showInactive,
      ).length,
  );

  const groups = $derived(() => {
    const buckets = new Map<string, NpcListItem[]>();
    for (const npc of filtered()) {
      const first = npc.sortKey.charAt(0).toUpperCase();
      const key = /[A-Z]/.test(first) ? first : '#';
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.push(npc);
      } else {
        buckets.set(key, [npc]);
      }
    }
    return [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  function clearFilters() {
    searchQuery = '';
    factionFilter = '';
    plotlineFilter = '';
    showInactive = false;
  }

  function getFactionName(id: string): string {
    return factionNames[id] ?? id;
  }

  function getPlotlineName(id: string): string {
    return plotlineNames[id] ?? id;
  }
</script>

<div class="npc-filters">
  <div class="filter-row">
    <div class="field">
      <label class="label" for="npc-search">Search</label>
      <div class="control">
        <input
          id="npc-search"
          class="input"
          type="text"
          bind:value={searchQuery}
          placeholder="Filter by name..."
        />
      </div>
    </div>

    {#if isGm}
      <div class="field">
        <label class="label" for="npc-faction">Faction</label>
        <div class="control">
          <div class="select">
            <select id="npc-faction" bind:value={factionFilter}>
              <option value="">All</option>
              <option value="__none__">No Faction</option>
              {#each filterOptions.factions as faction (faction)}
                <option value={faction}>{getFactionName(faction)}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="label" for="npc-plotline">Plotline</label>
        <div class="control">
          <div class="select">
            <select id="npc-plotline" bind:value={plotlineFilter}>
              <option value="">All</option>
              <option value="__none__">No Plotline</option>
              {#each filterOptions.plotlines as plotline (plotline)}
                <option value={plotline}>{getPlotlineName(plotline)}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>
    {/if}

    <div class="field show-inactive-field">
      <label class="checkbox">
        <input type="checkbox" bind:checked={showInactive} />
        Show inactive
      </label>
    </div>

    <div class="filter-actions">
      <button class="button" onclick={clearFilters}>Clear</button>
    </div>
  </div>

  <p class="filter-count">
    Showing {visibleCount()} of {npcs.length} NPCs
  </p>
</div>

{#if visibleCount() === 0}
  <div class="empty-state">
    <p>No NPCs match the current filters.</p>
    <button class="button is-small" onclick={clearFilters}>Clear filters</button>
  </div>
{:else}
  <div class="npc-groups">
    {#each groups() as [letter, items] (letter)}
      <section class="npc-group">
        <h3 class="letter-header">{letter}</h3>
        <ul class="npc-list">
          {#each items as npc (npc.id)}
            <li
              class="npc-item"
              class:hidden={npc.campaignStatus === 'inactive' && !showInactive}
            >
              <NpcListRow {npc} />
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{/if}

<style>
  .npc-filters {
    margin-bottom: 1rem;
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: flex-end;
  }

  .filter-row .field {
    margin-bottom: 0;
  }

  .filter-row .label {
    font-size: 0.875rem;
    margin-bottom: 0.25rem;
  }

  .filter-actions {
    display: flex;
    align-items: flex-end;
  }

  .show-inactive-field {
    display: flex;
    align-items: flex-end;
    padding-bottom: 0.5rem;
  }

  .show-inactive-field .checkbox {
    font-size: 0.875rem;
  }

  .filter-count {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: var(--bulma-text-weak);
  }

  .empty-state {
    margin-top: 1.5rem;
    padding: 1.25rem;
    border: 1px dashed var(--bulma-border);
    border-radius: 6px;
    text-align: center;
  }

  .empty-state p {
    margin-bottom: 0.75rem;
    color: var(--bulma-text-weak);
  }

  .npc-groups {
    columns: 2;
    column-gap: 2rem;
    margin-top: 0.5rem;
  }

  .npc-group {
    break-inside: avoid;
    margin-bottom: 1.25rem;
  }

  .letter-header {
    font-size: 1rem;
    font-weight: 700;
    color: var(--bulma-text-weak);
    border-bottom: 1px solid var(--bulma-border);
    margin: 0 0 0.5rem;
    padding-bottom: 0.125rem;
    letter-spacing: 0.05em;
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

  /* Hide letter groups whose items are all hidden (e.g. a letter with only
     inactive NPCs while "Show inactive" is off). */
  .npc-group:not(:has(.npc-item:not(.hidden))) {
    display: none;
  }

  @media (max-width: 768px) {
    .npc-groups {
      columns: 1;
    }

    .filter-row {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
