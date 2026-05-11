<script lang="ts">
  import {
    initBooleanFilterFromUrl,
    initFilterFromUrl,
    setBooleanUrlParam,
    setUrlParam,
  } from '../utils/url-filter-state';

  import Badge from './Badge.svelte';

  interface NpcListItem {
    id: string;
    href: string;
    displayName: string;
    sortKey: string;
    occupation: string;
    image?: string;
    factions: string[];
    plotlines: string[];
    visibility: 'player' | 'gm';
    campaignStatus: 'active' | 'inactive';
  }

  interface FilterOptions {
    factions: string[];
    plotlines: string[];
  }

  interface Props {
    npcs: NpcListItem[];
    filterOptions: FilterOptions;
    factionNames: Record<string, string>;
    plotlineNames: Record<string, string>;
  }

  const { npcs, filterOptions, factionNames, plotlineNames }: Props = $props();

  let searchQuery = $state(initFilterFromUrl('q'));
  let factionFilter = $state(initFilterFromUrl('faction'));
  let plotlineFilter = $state(initFilterFromUrl('plotline'));
  let showInactive = $state(initBooleanFilterFromUrl('show-inactive'));

  $effect(() => {
    setUrlParam('q', searchQuery);
  });
  $effect(() => {
    setUrlParam('faction', factionFilter);
  });
  $effect(() => {
    setUrlParam('plotline', plotlineFilter);
  });
  $effect(() => {
    setBooleanUrlParam('show-inactive', showInactive);
  });

  const filtered = $derived(() => {
    const query = searchQuery.trim().toLowerCase();
    return npcs.filter((npc) => {
      if (npc.campaignStatus === 'inactive' && !showInactive) return false;
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
    Showing {filtered().length} of {npcs.length} NPCs
  </p>
</div>

{#if filtered().length === 0}
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
            <li class="npc-item">
              <a class="npc-link" href={npc.href}>
                {#if npc.image}
                  <img class="npc-thumb" src={npc.image} alt="" loading="lazy" />
                {:else}
                  <span class="npc-thumb npc-thumb-placeholder" aria-hidden="true"></span>
                {/if}
                <span class="npc-text">
                  <span class="npc-name">
                    {npc.displayName}
                    {#if npc.visibility === 'gm'}
                      <Badge color="purple">GM</Badge>
                    {/if}
                    {#if npc.campaignStatus === 'inactive'}
                      <Badge color="gray">inactive</Badge>
                    {/if}
                  </span>
                  <span class="npc-occupation">{npc.occupation}</span>
                </span>
              </a>
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

  .npc-link {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.25rem 0.25rem 0.25rem 0;
    color: inherit;
    text-decoration: none;
    border-radius: 4px;
  }

  .npc-link:hover {
    background-color: var(--bulma-scheme-main-bis);
  }

  .npc-link:hover .npc-name {
    text-decoration: underline;
    color: var(--bulma-link-text);
  }

  .npc-thumb {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    border-radius: 4px;
    object-fit: cover;
    background-color: var(--bulma-scheme-main-bis);
  }

  .npc-thumb-placeholder {
    display: inline-block;
    border: 1px dashed var(--bulma-border);
  }

  .npc-text {
    display: flex;
    flex-direction: column;
    line-height: 1.25;
    min-width: 0;
  }

  .npc-name {
    font-weight: 600;
    color: var(--bulma-strong-color);
  }

  .npc-occupation {
    font-size: 0.85rem;
    color: var(--bulma-text-weak);
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
