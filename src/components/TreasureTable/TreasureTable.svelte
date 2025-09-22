<script lang="ts">
  import {
    formatRarity,
    formatType,
    formatValue,
  } from '../../utils/treasure.ts';

  import type { ExtendedTreasureData } from '../../types';

  interface Props {
    treasure: ExtendedTreasureData[];
  }

  const { treasure }: Props = $props();
</script>

{#if treasure.length > 0}
  <table class="treasure-table">
    <thead>
      <tr>
        <th>Item</th>
        <th>Value</th>
        <th>Type</th>
        <th>Rarity</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      {#each treasure as item, index (index)}
        <tr>
          <td>{item.name}</td>
          <td>{formatValue(item.value)}</td>
          <td>{formatType(item.type)}</td>
          <td>{formatRarity(item.rarity)}</td>
          <td>{@html item.renderedNotes}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .treasure-table td,
  .treasure-table th {
    border-bottom: 1px solid var(--bulma-border);
    padding-right: 1rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  .treasure-table th {
    border-top: 1px solid var(--bulma-border);
  }

  table {
    border-spacing: 0;
    margin: 1rem 0;
  }

  th,
  td {
    border-bottom: 1px solid var(--bulma-border);
    padding-right: 1rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  th {
    border-top: 1px solid var(--bulma-border);
  }
</style>
