<script lang="ts">
  import { sortIgnoringArticles } from '@achm/core';

  import {
    initBooleanFilterFromUrl,
    initFilterFromUrl,
    setBooleanUrlParam,
    setUrlParam,
  } from '../utils/url-filter-state';

  import Badge from './Badge.svelte';

  type BeatStatus = 'pending' | 'active' | 'resolved' | 'skipped';

  interface BeatListItem {
    plotlineSlug: string;
    slug: string;
    title: string;
    trigger: string;
    status: BeatStatus;
    factions: string[];
    plotline: string;
    tags: string[];
    campaignStatus: 'active' | 'inactive';
  }

  interface FilterOptions {
    tags: string[];
    factions: string[];
    plotlines: string[];
  }

  interface Props {
    beats: BeatListItem[];
    filterOptions: FilterOptions;
    plotlineNames: Record<string, string>;
  }

  const { beats, filterOptions, plotlineNames }: Props = $props();

  let searchQuery = $state(initFilterFromUrl('search'));
  let tagFilter = $state(initFilterFromUrl('tag'));
  let factionFilter = $state(initFilterFromUrl('faction'));
  let plotlineFilter = $state(initFilterFromUrl('plotline'));
  let statusFilter = $state(initFilterFromUrl('status'));
  let sortBy = $state(initFilterFromUrl('sort', 'title'));
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
    setUrlParam('plotline', plotlineFilter);
  });
  $effect(() => {
    setUrlParam('status', statusFilter);
  });
  $effect(() => {
    setUrlParam('sort', sortBy === 'title' ? '' : sortBy);
  });
  $effect(() => {
    setBooleanUrlParam('show-inactive', showInactive);
  });

  const statusOrder: Record<BeatStatus, number> = {
    active: 0,
    pending: 1,
    resolved: 2,
    skipped: 3,
  };

  const statusBadgeColor: Record<BeatStatus, 'gray' | 'green'> = {
    pending: 'gray',
    active: 'green',
    resolved: 'gray',
    skipped: 'gray',
  };

  let filtered = $derived(() => {
    const result = beats.filter((beat) => {
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

      if (plotlineFilter && beat.plotline !== plotlineFilter) {
        return false;
      }

      if (statusFilter && beat.status !== statusFilter) {
        return false;
      }

      return true;
    });

    if (sortBy === 'plotline') {
      result.sort((a, b) => {
        const cmp = sortIgnoringArticles(
          getPlotlineName(a.plotline),
          getPlotlineName(b.plotline),
        );
        if (cmp !== 0) return cmp;
        return sortIgnoringArticles(a.title, b.title);
      });
    } else if (sortBy === 'status') {
      result.sort((a, b) => {
        const cmp = statusOrder[a.status] - statusOrder[b.status];
        if (cmp !== 0) return cmp;
        return sortIgnoringArticles(a.title, b.title);
      });
    }
    // 'title' is the default — beats arrive pre-sorted by title.

    return result;
  });

  function clearFilters() {
    searchQuery = '';
    tagFilter = '';
    factionFilter = '';
    plotlineFilter = '';
    statusFilter = '';
    sortBy = 'title';
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

  function getBeatHref(beat: BeatListItem): string {
    return `/gm-reference/plotlines/${beat.plotlineSlug}/beats/${beat.slug}`;
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

    <div class="field">
      <label class="label" for="sort">Sort</label>
      <div class="control">
        <div class="select">
          <select id="sort" bind:value={sortBy}>
            <option value="title">Title</option>
            <option value="plotline">Plotline</option>
            <option value="status">Status</option>
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
      <div class="beat-header">
        <a href={getBeatHref(beat)} class="beat-title">{beat.title}</a>
        <Badge color={statusBadgeColor[beat.status]}>{beat.status}</Badge>
        {#if beat.campaignStatus === 'inactive'}
          <Badge color="gray">inactive</Badge>
        {/if}
      </div>
      <p class="beat-meta">
        <span class="plotline-name">{getPlotlineName(beat.plotline)}</span>
        {#if beat.tags.length > 0}
          <span class="tag-list">
            {#each beat.tags as tag (tag)}
              <span class="tag">{tag}</span>
            {/each}
          </span>
        {/if}
      </p>
      {#if beat.trigger}
        <p class="beat-trigger">{beat.trigger}</p>
      {/if}
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

  .beat-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .beat-item {
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--bulma-border);
  }

  .beat-item:last-child {
    border-bottom: none;
  }

  .beat-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
  }

  .beat-title {
    font-weight: 600;
  }

  .beat-meta {
    margin: 0.125rem 0 0.25rem;
    font-size: 0.875rem;
    color: var(--bulma-text-weak);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .plotline-name {
    font-style: italic;
  }

  .tag-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .tag {
    background: var(--bulma-scheme-main-ter);
    border-radius: 3px;
    padding: 0.0625rem 0.375rem;
    font-size: 0.75rem;
  }

  .beat-trigger {
    margin: 0;
    font-size: 0.95rem;
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
