<script lang="ts">
  import Badge from './Badge.svelte';

  interface ClueListItem {
    id: string;
    name: string;
    summary: string;
    status: 'known' | 'unknown';
    factions: string[];
    plotlines: string[];
    tags: string[];
    isUsed: boolean;
    needsReview: boolean;
  }

  interface FilterOptions {
    factions: string[];
    plotlines: string[];
    tags: string[];
  }

  interface Props {
    clues: ClueListItem[];
    filterOptions: FilterOptions;
    plotlineNames: Record<string, string>;
  }

  const { clues, filterOptions, plotlineNames }: Props = $props();

  let searchQuery = $state('');
  let statusFilter = $state('');
  let factionFilter = $state('');
  let plotlineFilter = $state('');
  let tagFilter = $state('');
  let usageFilter = $state('');
  let reviewFilter = $state('');

  let filtered = $derived(() => {
    return clues.filter((clue) => {
      // Search filter - matches name or summary
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !clue.name.toLowerCase().includes(query) &&
          !clue.summary.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && clue.status !== statusFilter) {
        return false;
      }

      // Faction filter
      if (factionFilter) {
        if (factionFilter === '__none__') {
          if (clue.factions.length > 0) return false;
        } else {
          if (!clue.factions.includes(factionFilter)) return false;
        }
      }

      // Plotline filter
      if (plotlineFilter && !clue.plotlines.includes(plotlineFilter)) {
        return false;
      }

      // Tag filter
      if (tagFilter && !clue.tags.includes(tagFilter)) {
        return false;
      }

      // Usage filter
      if (usageFilter === 'used' && !clue.isUsed) return false;
      if (usageFilter === 'unused' && clue.isUsed) return false;

      // Review filter
      if (reviewFilter === 'needs-review' && !clue.needsReview) return false;
      if (reviewFilter === 'ok' && clue.needsReview) return false;

      return true;
    });
  });

  function clearFilters() {
    searchQuery = '';
    statusFilter = '';
    factionFilter = '';
    plotlineFilter = '';
    tagFilter = '';
    usageFilter = '';
    reviewFilter = '';
  }

  function formatFaction(faction: string): string {
    return faction
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getPlotlineName(id: string): string {
    return plotlineNames[id] ?? id;
  }
</script>

<div class="clue-filters">
  <div class="filter-row">
    <div class="field">
      <label class="label" for="search">Search</label>
      <div class="control">
        <input
          id="search"
          class="input"
          type="text"
          bind:value={searchQuery}
          placeholder="Filter by name/summary..."
        />
      </div>
    </div>

    <div class="field">
      <label class="label" for="status">Status</label>
      <div class="control">
        <div class="select">
          <select id="status" bind:value={statusFilter}>
            <option value="">All</option>
            <option value="known">Known</option>
            <option value="unknown">Unknown</option>
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
            {#each filterOptions.factions as faction (faction)}
              <option value={faction}>{formatFaction(faction)}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="plotline">Plotline</label>
      <div class="control">
        <div class="select">
          <select id="plotline" bind:value={plotlineFilter}>
            <option value="">All</option>
            {#each filterOptions.plotlines as plotline (plotline)}
              <option value={plotline}>{getPlotlineName(plotline)}</option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <div class="field">
      <label class="label" for="tag">Tag</label>
      <div class="control">
        <div class="select">
          <select id="tag" bind:value={tagFilter}>
            <option value="">All</option>
            {#each filterOptions.tags as tag (tag)}
              <option value={tag}>{tag}</option>
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

    <div class="field">
      <label class="label" for="review">Review</label>
      <div class="control">
        <div class="select">
          <select id="review" bind:value={reviewFilter}>
            <option value="">All</option>
            <option value="needs-review">Needs Review</option>
            <option value="ok">OK</option>
          </select>
        </div>
      </div>
    </div>

    <div class="filter-actions">
      <button class="button" onclick={clearFilters}>Clear</button>
    </div>
  </div>

  <p class="filter-count">
    Showing {filtered().length} of {clues.length} clues
  </p>
</div>

<p class="legend">
  <span class="unused-text">Italic</span> = unused |
  <Badge color="green">Known</Badge> = discovered by players |
  <Badge color="orange">Review</Badge> = needs more placements
</p>

<ul class="clue-list">
  {#each filtered() as clue (clue.id)}
    <li class="clue-item">
      <a
        href={`/session-toolkit/clues/${clue.id}`}
        class={clue.isUsed ? '' : 'unused-text'}
      >
        {clue.name}
      </a>
      {#if clue.status === 'known'}
        <Badge color="green">Known</Badge>
      {/if}
      {#if clue.needsReview}
        <Badge color="orange">Review</Badge>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .clue-filters {
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

  .clue-list {
    columns: 3;
    column-gap: 2rem;
    margin-top: 0;
  }

  .clue-item {
    break-inside: avoid;
  }

  @media (max-width: 1024px) {
    .clue-list {
      columns: 2;
    }
  }

  @media (max-width: 768px) {
    .clue-list {
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
