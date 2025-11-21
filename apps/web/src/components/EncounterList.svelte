<script lang="ts">
  import type { CreatureType, Faction, LocationType } from '@skyreach/schemas';

  interface EncounterItem {
    id: string;
    name: string;
    scope: string | undefined;
    locationTypes: LocationType[];
    factions: Faction[];
    creatureTypes: CreatureType[];
    isUsed: boolean;
  }

  interface FilterOptions {
    scopes: string[];
    locationTypes: string[];
    factions: string[];
    creatureTypes: string[];
  }

  interface Props {
    encounters: EncounterItem[];
    filterOptions: FilterOptions;
  }

  const { encounters, filterOptions }: Props = $props();

  let scopeFilter = $state('');
  let locationFilter = $state('');
  let factionFilter = $state('');
  let creatureFilter = $state('');
  let usageFilter = $state('');
  let searchQuery = $state('');

  let filtered = $derived(() => {
    return encounters.filter((enc) => {
      // Search filter
      if (searchQuery && !enc.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Scope filter
      if (scopeFilter && enc.scope !== scopeFilter) {
        return false;
      }

      // Location filter
      if (locationFilter && !enc.locationTypes.includes(locationFilter as LocationType)) {
        return false;
      }

      // Faction filter
      if (factionFilter) {
        if (factionFilter === '__none__') {
          if (enc.factions.length > 0) return false;
        } else {
          if (!enc.factions.includes(factionFilter as Faction)) return false;
        }
      }

      // Creature filter
      if (creatureFilter && !enc.creatureTypes.includes(creatureFilter as CreatureType)) {
        return false;
      }

      // Usage filter
      if (usageFilter === 'used' && !enc.isUsed) return false;
      if (usageFilter === 'unused' && enc.isUsed) return false;

      return true;
    });
  });

  function clearFilters() {
    scopeFilter = '';
    locationFilter = '';
    factionFilter = '';
    creatureFilter = '';
    usageFilter = '';
    searchQuery = '';
  }

  function formatFaction(faction: string): string {
    return faction
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
</script>

<div class="encounter-filters">
  <div class="filter-row">
    <div class="field">
      <label class="label" for="search">Search</label>
      <div class="control">
        <input
          id="search"
          class="input"
          type="text"
          bind:value={searchQuery}
          placeholder="Filter by name..."
        />
      </div>
    </div>

    <div class="field">
      <label class="label" for="scope">Scope</label>
      <div class="control">
        <div class="select">
          <select id="scope" bind:value={scopeFilter}>
            <option value="">All</option>
            {#each filterOptions.scopes as scope}
              <option value={scope}>{scope}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="location">Location</label>
      <div class="control">
        <div class="select">
          <select id="location" bind:value={locationFilter}>
            <option value="">All</option>
            {#each filterOptions.locationTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="faction">Faction</label>
      <div class="control">
        <div class="select">
          <select id="faction" bind:value={factionFilter}>
            <option value="">All</option>
            <option value="__none__">No Faction</option>
            {#each filterOptions.factions as faction}
              <option value={faction}>{formatFaction(faction)}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="creature">Creature</label>
      <div class="control">
        <div class="select">
          <select id="creature" bind:value={creatureFilter}>
            <option value="">All</option>
            {#each filterOptions.creatureTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="usage">Usage</label>
      <div class="control">
        <div class="select">
          <select id="usage" bind:value={usageFilter}>
            <option value="">All</option>
            <option value="used">Used</option>
            <option value="unused">Unused</option>
          </select>
        </div>
      </div>
    </div>

    <div class="filter-actions">
      <button class="button" onclick={clearFilters}>Clear</button>
    </div>
  </div>

  <p class="filter-count">
    Showing {filtered().length} of {encounters.length} encounters
  </p>
</div>

<p class="legend">
  <span class="unused-text">Italic</span> = unused |
  <span class="scope-tag scope-dungeon">dungeon</span>
  <span class="scope-tag scope-hex">hex</span>
  <span class="scope-tag scope-region">region</span> = specific scope
</p>

<ul class="encounter-list">
  {#each filtered() as encounter (encounter.id)}
    <li class="encounter-item">
      <a
        href={`/gm-reference/encounters/${encounter.id}`}
        class={encounter.isUsed ? '' : 'unused-text'}
      >
        {encounter.name}
      </a>
      {#if encounter.scope && encounter.scope !== 'general'}
        <span
          class="scope-tag"
          class:scope-dungeon={encounter.scope === 'dungeon'}
          class:scope-hex={encounter.scope === 'hex'}
          class:scope-region={encounter.scope === 'region'}
        >
          {encounter.scope}
        </span>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .encounter-filters {
    margin-bottom: 0.5rem;
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

  .filter-count {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: var(--bulma-text-weak);
  }

  .legend {
    margin-bottom: 1rem;
    font-size: 0.875rem;
    color: var(--bulma-text-weak);
  }

  .unused-text {
    font-style: italic;
    color: var(--bulma-text-weak);
  }

  .encounter-list {
    columns: 3;
    column-gap: 2rem;
    margin-top: 0;
  }

  .encounter-item {
    break-inside: avoid;
  }

  .encounter-item .scope-tag {
    margin-left: 0.25rem;
  }

  .scope-tag {
    display: inline-block;
    font-size: 0.7rem;
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
    font-weight: 500;
  }

  .scope-dungeon {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .scope-hex {
    background-color: #dcfce7;
    color: #166534;
  }

  .scope-region {
    background-color: #fef3c7;
    color: #92400e;
  }

  @media (prefers-color-scheme: dark) {
    .scope-dungeon {
      background-color: #1e3a5f;
      color: #93c5fd;
    }

    .scope-hex {
      background-color: #14532d;
      color: #86efac;
    }

    .scope-region {
      background-color: #78350f;
      color: #fcd34d;
    }
  }

  @media (max-width: 1024px) {
    .encounter-list {
      columns: 2;
    }
  }

  @media (max-width: 768px) {
    .encounter-list {
      columns: 1;
    }

    .filter-row {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-actions {
      margin-left: 0;
    }
  }
</style>
