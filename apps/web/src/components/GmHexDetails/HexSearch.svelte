<script lang="ts">
  import { onMount } from 'svelte';

  import GmHexDetails from './GmHexDetails.svelte';

  import type { MapConfig } from '@achm/schemas';

  import type {
    DungeonEntry,
    ExtendedHexData,
    PointcrawlLink,
  } from '../../types';

  interface Props {
    dungeons: DungeonEntry[];
    hexes: ExtendedHexData[];
    mapConfig: MapConfig;
    pointcrawlsByHex?: Record<string, PointcrawlLink[]>;
  }

  const { dungeons, hexes, mapConfig, pointcrawlsByHex = {} }: Props = $props();

  let query = $state('');
  let results: ExtendedHexData[] = $state([]);

  const isHexId = (input: string): boolean =>
    /^[a-z]\s*-?\s*\d{1,2}$/i.test(input.trim());

  const normalizeHexId = (input: string): string =>
    input.replace(/[^a-z0-9]/gi, '').toUpperCase();

  const searchHexes = () => {
    const q = query.trim().toLowerCase();

    if (q === '') {
      results = hexes; // Show all
    } else if (isHexId(q)) {
      const id = normalizeHexId(q);
      results = hexes.filter((hex) => hex.id.toUpperCase() === id);
    } else {
      results = hexes.filter(
        (hex) =>
          hex.name.toLowerCase().includes(q) ||
          (typeof hex.landmark === 'string' &&
            hex.landmark.toLowerCase().includes(q)) ||
          (typeof hex.landmark !== 'string' &&
            hex.landmark.description.toLowerCase().includes(q)) ||
          hex.hiddenSites?.some((site) => {
            if (typeof site === 'string') {
              return site.toLowerCase().includes(q);
            }
            return site.description.toLowerCase().includes(q);
          }) ||
          hex.notes?.some((note) => {
            return note.toLowerCase().includes(q);
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
      <GmHexDetails
        {dungeons}
        {hex}
        {mapConfig}
        pointcrawls={pointcrawlsByHex[hex.id.toLowerCase()]}
        showSelfLink={true}
      />
    {/each}
  {/if}
</div>
