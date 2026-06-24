<script lang="ts">
  import { type LinkType } from '@achm/schemas';

  import { getLinkPath, getLinkText } from '../../utils/link-generator';
  import HexBeatList from './HexBeatList.svelte';
  import HexClueList from './HexClueList.svelte';
  import TreasureTable from '../TreasureTable/TreasureTable.svelte';

  import type { BeatMapEntry, ClueMapEntry, ExtendedHexData, ExtendedHiddenSites } from '../../types.ts';

  interface Props {
    beatMap?: Record<string, BeatMapEntry>;
    clueMap?: Record<string, ClueMapEntry>;
    hex: ExtendedHexData;
  }

  const { beatMap = {}, clueMap = {}, hex }: Props = $props();

  /**
   * Type guard to check if a hidden site has link fields.
   */
  function hasLink(site: ExtendedHiddenSites): site is ExtendedHiddenSites & { linkType: LinkType; linkId: string } {
    return 'linkType' in site && 'linkId' in site && !!site.linkType && !!site.linkId;
  }
</script>

{#if hex.renderedHiddenSites && hex.renderedHiddenSites.length > 0}
  {#if hex.renderedHiddenSites.length === 1}
    {@const site = hex.renderedHiddenSites[0]}
    <div>
      <div class="inline-heading-block">
        <span class="inline-heading">Hidden Site:</span>
        {@html site.description}
        {#if hasLink(site)}
          <p>&rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a></p>
        {/if}
      </div>
      <div style="margin-left: 1rem">
        <HexClueList clues={site.clues} {clueMap} />
        <HexBeatList beats={site.beats} {beatMap} />
      </div>
      {#if site.treasure}
        <TreasureTable treasure={site.treasure} />
      {/if}
    </div>
  {:else}
    <div>
      <span class="inline-heading keep-with-next">Hidden Sites:</span>
    </div>
    <ul class="hidden-sites-list">
      {#each hex.renderedHiddenSites as site (site.description)}
        <li>
          {@html site.description}
          {#if hasLink(site)}
            &rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a>
          {/if}
          <div>
            <HexClueList clues={site.clues} {clueMap} />
            <HexBeatList beats={site.beats} {beatMap} />
          </div>
          {#if site.treasure}
            <TreasureTable treasure={site.treasure} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}

<style>
  .hidden-sites-list {
    margin-bottom: 0;
  }
</style>
