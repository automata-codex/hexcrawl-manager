<script lang="ts">
  import {
    initBooleanFilterFromUrl,
    initFilterFromUrl,
    setBooleanUrlParam,
    setUrlParam,
  } from '../utils/url-filter-state';

  type BeatStatus = 'pending' | 'active' | 'resolved' | 'skipped';

  interface BeatListItem {
    plotlineSlug: string;
    slug: string;
    title: string;
    trigger: string;
    /** Pre-rendered markdown of `trigger` (may be empty). */
    triggerHtml: string;
    status: BeatStatus;
    factions: string[];
    npcs: string[];
    plotline: string;
    tags: string[];
    campaignStatus: 'active' | 'inactive';
  }

  interface FilterOptions {
    tags: string[];
    factions: string[];
    npcs: string[];
    plotlines: string[];
  }

  interface Props {
    beats: BeatListItem[];
    filterOptions: FilterOptions;
    plotlineNames: Record<string, string>;
    npcNames: Record<string, string>;
  }

  const { beats, filterOptions, plotlineNames, npcNames }: Props = $props();

  let searchQuery = $state(initFilterFromUrl('search'));
  let tagFilter = $state(initFilterFromUrl('tag'));
  let factionFilter = $state(initFilterFromUrl('faction'));
  let npcFilter = $state(initFilterFromUrl('npc'));
  let plotlineFilter = $state(initFilterFromUrl('plotline'));
  let statusFilter = $state(initFilterFromUrl('status'));
  let showInactive = $state(initBooleanFilterFromUrl('show-inactive'));

  $effect(() => {
    setUrlParam('search', searchQuery);
  });
  $effect(() => {
    setUrlParam('tag', tagFilter);
  });
  $effect(() => {
    setUrlParam('faction', factionFilter);
  });
  $effect(() => {
    setUrlParam('npc', npcFilter);
  });
  $effect(() => {
    setUrlParam('plotline', plotlineFilter);
  });
  $effect(() => {
    setUrlParam('status', statusFilter);
  });
  $effect(() => {
    setBooleanUrlParam('show-inactive', showInactive);
  });

  let filtered = $derived(() => {
    return beats.filter((beat) => {
      if (beat.campaignStatus === 'inactive' && !showInactive) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !beat.title.toLowerCase().includes(query) &&
          !beat.trigger.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      if (tagFilter && !beat.tags.includes(tagFilter)) {
        return false;
      }

      if (factionFilter) {
        if (factionFilter === '__none__') {
          if (beat.factions.length > 0) return false;
        } else {
          if (!beat.factions.includes(factionFilter)) return false;
        }
      }

      if (npcFilter && !beat.npcs.includes(npcFilter)) {
        return false;
      }

      if (plotlineFilter && beat.plotline !== plotlineFilter) {
        return false;
      }

      if (statusFilter && beat.status !== statusFilter) {
        return false;
      }

      return true;
    });
  });

  function clearFilters() {
    searchQuery = '';
    tagFilter = '';
    factionFilter = '';
    npcFilter = '';
    plotlineFilter = '';
    statusFilter = '';
    showInactive = false;
  }

  function formatFaction(faction: string): string {
    return faction
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function getPlotlineName(slug: string): string {
    return plotlineNames[slug] ?? slug;
  }

  function getNpcName(id: string): string {
    return npcNames[id] ?? id;
  }
</script>

<div class="beat-filters">
  <div class="filter-row">
    <div class="field">
      <label class="label" for="search">Search</label>
      <div class="control">
        <input
          id="search"
          class="input"
          type="text"
          bind:value={searchQuery}
          placeholder="Filter by title or trigger..."
        />
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
      <label class="label" for="npc">NPC</label>
      <div class="control">
        <div class="select">
          <select id="npc" bind:value={npcFilter}>
            <option value="">All</option>
            {#each filterOptions.npcs as npc (npc)}
              <option value={npc}>{getNpcName(npc)}</option>
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
      <label class="label" for="status">Status</label>
      <div class="control">
        <div class="select">
          <select id="status" bind:value={statusFilter}>
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="skipped">Skipped</option>
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
    Showing {filtered().length} of {beats.length} beats
  </p>
</div>

<ul class="beat-list">
  {#each filtered() as beat (beat.plotlineSlug + '/' + beat.slug)}
    <li class="beat-item">
      <a
        href={`/gm-reference/plotlines/${beat.plotlineSlug}/beats/${beat.slug}`}
        >{beat.title}</a
      >{#if beat.triggerHtml}&nbsp;&mdash; <span class="beat-trigger"
          >{@html beat.triggerHtml}</span
        >{/if}
    </li>
  {/each}
</ul>

<style>
  .beat-filters {
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

  /* Single column. The global `ul` rule supplies the disc marker; the
     padding-inline-start provides the gutter (same approach as the GM hex
     details beat list). */
  .beat-list {
    margin-top: 0;
    padding-inline-start: 1rem;
  }

  .beat-trigger {
    font-style: italic;
    color: var(--bulma-text-weak);
  }

  @media (max-width: 768px) {
    .filter-row {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-actions {
      margin-left: 0;
    }
  }
</style>
