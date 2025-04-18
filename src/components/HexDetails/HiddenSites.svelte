<script lang="ts">
  import type { ExtendedHexData } from '../../types.ts';

  interface Props {
    hex: ExtendedHexData;
  }

  const { hex }: Props = $props();
</script>
{#if hex.renderedHiddenSites && hex.renderedHiddenSites.length > 0}
  {#if hex.renderedHiddenSites.length === 1}
    <div class="hanging-indent">
      <span class="inline-heading">Hidden Site:</span>{' '}
      {@html hex.renderedHiddenSites[0]}
    </div>
  {:else}
    <div>
      <span class="inline-heading keep-with-next">Hidden Sites:</span>
    </div>
    <ul>
      {#each hex.renderedHiddenSites as site}
        <li>
          {@html site}
        </li>
      {/each}
    </ul>
  {/if}
{/if}
