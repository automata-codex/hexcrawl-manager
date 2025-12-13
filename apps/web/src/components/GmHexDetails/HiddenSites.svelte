<script lang="ts">
  import { getCluePath } from '../../config/routes.ts';
  import { getLinkPath, getLinkText } from '../../utils/link-generator';
  import TreasureTable from '../TreasureTable/TreasureTable.svelte';

  import type { ClueMapEntry, ExtendedHexData, ExtendedHiddenSites } from '../../types.ts';
  import type { LinkType } from '@skyreach/schemas';

  interface Props {
    clueMap?: Record<string, ClueMapEntry>;
    hex: ExtendedHexData;
  }

  const { clueMap = {}, hex }: Props = $props();

  /**
   * Type guard to check if a hidden site has link fields.
   */
  function hasLink(site: ExtendedHiddenSites): site is ExtendedHiddenSites & { linkType: LinkType; linkId: string } {
    return 'linkType' in site && 'linkId' in site && !!site.linkType && !!site.linkId;
  }

  /**
   * Get clue display data for a site.
   */
  function getSiteClues(site: ExtendedHiddenSites) {
    if (!site.clues) return [];
    return site.clues.map((id) => ({
      id,
      name: clueMap?.[id]?.name ?? id,
      found: !!clueMap?.[id],
    }));
  }
</script>

{#if hex.renderedHiddenSites && hex.renderedHiddenSites.length > 0}
  {#if hex.renderedHiddenSites.length === 1}
    {@const site = hex.renderedHiddenSites[0]}
    {@const siteClues = getSiteClues(site)}
    <div>
      <div class="inline-heading-block">
        <span class="inline-heading">Hidden Site:</span>
        {@html site.description}
        {#if hasLink(site)}
          <p>&rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a></p>
        {/if}
      </div>
      <div style="margin-left: 1rem">
        {#if siteClues.length > 0}
          <p>
            <strong>Clues:</strong>
            {#each siteClues as clue, i (i)}
              {#if clue.found}
                <a href={getCluePath(clue.id)}>{clue.name}</a>
              {:else}
                <span class="has-text-danger">{clue.name} (not found)</span>
              {/if}
              {#if i < siteClues.length - 1}, {/if}
            {/each}
          </p>
        {/if}
      </div>
      {#if site.treasure}
        <TreasureTable treasure={site.treasure} />
      {/if}
    </div>
  {:else}
    <div>
      <span class="inline-heading keep-with-next">Hidden Sites:</span>
    </div>
    <ul>
      {#each hex.renderedHiddenSites as site (site.description)}
        {@const siteClues = getSiteClues(site)}
        <li>
          {@html site.description}
          {#if hasLink(site)}
            &rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a>
          {/if}
          <div>
            {#if siteClues.length > 0}
              <p>
                <strong>Clues:</strong>
                {#each siteClues as clue, i (i)}
                  {#if clue.found}
                    <a href={getCluePath(clue.id)}>{clue.name}</a>
                  {:else}
                    <span class="has-text-danger">{clue.name} (not found)</span>
                  {/if}
                  {#if i < siteClues.length - 1}, {/if}
                {/each}
              </p>
            {/if}
          </div>
          {#if site.treasure}
            <TreasureTable treasure={site.treasure} />
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}
