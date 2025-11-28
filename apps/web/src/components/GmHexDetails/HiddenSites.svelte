<script lang="ts">
  import { getLinkPath, getLinkText } from '../../utils/link-generator';
  import TreasureTable from '../TreasureTable/TreasureTable.svelte';
  import Unlocks from '../Unlocks.svelte';

  import type { ExtendedHexData, ExtendedHiddenSites, FlatKnowledgeTree } from '../../types.ts';
  import type { LinkType } from '@skyreach/schemas';

  interface Props {
    hex: ExtendedHexData;
    knowledgeTrees: Record<string, FlatKnowledgeTree>;
  }

  const { hex, knowledgeTrees }: Props = $props();

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
      <p class="hanging-indent">
        <span class="inline-heading">Hidden Site:</span>
        {@html site.description}
        {#if hasLink(site)}
          &rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a>
        {/if}
      </p>
      <div style="margin-left: 1rem">
        {#if site.unlocks}
          <Unlocks
            {knowledgeTrees}
            unlocks={site.unlocks}
          />
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
        <li>
          {@html site.description}
          {#if hasLink(site)}
            &rarr; <a href={getLinkPath(site.linkType, site.linkId)}>{getLinkText(site.linkType, site.linkId)}</a>
          {/if}
          <div>
            {#if site.unlocks}
              <Unlocks {knowledgeTrees} unlocks={site.unlocks} />
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
