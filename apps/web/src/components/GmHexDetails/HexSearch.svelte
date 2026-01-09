<script lang="ts">
  import { LETTER_NUMBER_PREFIX_RE, NUMERIC_PREFIX_RE } from '@achm/core';
  import { onMount } from 'svelte';

  import HexSearchResult from './HexSearchResult.svelte';

  import type { DungeonEntry, ExtendedHexData, PointcrawlLink } from '../../types';
  import type { MapConfig } from '@achm/schemas';

  interface Props {
    dungeons: DungeonEntry[];
    hexes: ExtendedHexData[];
    mapConfig: MapConfig;
    pointcrawlsByHex?: Record<string, PointcrawlLink[]>;
  }

  const { dungeons, hexes, mapConfig, pointcrawlsByHex = {} }: Props = $props();

  let query = $state('');
  let results: ExtendedHexData[] = $state([]);

  const isHexIdPrefix = (input: string): boolean => {
    const trimmed = input.trim();
    if (mapConfig.grid.notation === 'letter-number') {
      return LETTER_NUMBER_PREFIX_RE.test(trimmed);
    }
    return NUMERIC_PREFIX_RE.test(trimmed);
  };

  const normalizeHexIdPrefix = (input: string): string => {
    if (mapConfig.grid.notation === 'letter-number') {
      return input.replace(/[^a-z0-9]/gi, '').toLowerCase();
    }
    return input.trim();
  };

  const searchHexes = () => {
    const q = query.trim().toLowerCase();

    if (q === '') {
      results = hexes; // Show all
    } else if (isHexIdPrefix(query)) {
      const prefix = normalizeHexIdPrefix(query);
      results = hexes.filter((hex) => hex.id.toLowerCase().startsWith(prefix));
    } else {
      results = hexes.filter(
        (hex) =>
          hex.name.toLowerCase().includes(q) ||
          (typeof hex.landmark === 'string' &&
            hex.landmark.toLowerCase().includes(q)) ||
          (typeof hex.landmark !== 'string' &&
            hex.landmark?.description.toLowerCase().includes(q)) ||
          hex.hiddenSites?.some((site) => {
            if (typeof site === 'string') {
              return site.toLowerCase().includes(q);
            }
            return site.description.toLowerCase().includes(q);
          }) ||
          hex.notes?.some((note) => {
            if (typeof note === 'string') {
              return note.toLowerCase().includes(q);
            }
            return note.description.toLowerCase().includes(q);
          }) ||
          hex.secretSite?.toLowerCase().includes(q),
      );
    }
  };

  onMount(() => {
    results = hexes; // Show all by default
  });
</script>

<div class="hex-search">
  <input
    class="input"
    type="text"
    bind:value={query}
    oninput={searchHexes}
    placeholder="Search by Hex ID (e.g. R17) or keyword..."
  />

  {#if results.length === 0 && query}
    <p>No matches found.</p>
  {/if}

  {#if results.length > 0}
    {#each results as hex (hex.id)}
      <h2 class="title is-3">{hex.id.toUpperCase()}: {hex.name}</h2>
      <HexSearchResult
        {dungeons}
        {hex}
        pointcrawls={pointcrawlsByHex[hex.id.toLowerCase()]}
      />
    {/each}
  {/if}
</div>
