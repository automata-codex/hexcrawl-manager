<script lang="ts">
  import { getEncounterPath } from '../../config/routes.ts';

  import type { EncounterMapEntry, ExtendedHexData } from '../../types.ts';

  interface Props {
    encounterMap?: Record<string, EncounterMapEntry>;
    hex: ExtendedHexData;
  }

  const { encounterMap = {}, hex }: Props = $props();

  function formatTrigger(trigger: string): string {
    switch (trigger) {
      case 'entry':
        return 'On entry';
      case 'exploration':
        return 'On exploration';
      default:
        return trigger;
    }
  }

  function getEncounterName(encounterId: string): string {
    return encounterMap[encounterId]?.name ?? encounterId;
  }
</script>

{#if hex.keyedEncounters && hex.keyedEncounters.length > 0}
  <div class="keyed-encounters">
    <span class="inline-heading keep-with-next">Keyed Encounters:</span>
    <ul>
      {#each hex.keyedEncounters as encounter (encounter.encounterId)}
        <li>
          <a href={getEncounterPath(encounter.encounterId)}>{getEncounterName(encounter.encounterId)}</a>
          <span class="trigger">({formatTrigger(encounter.trigger)})</span>
          {#if encounter.notes}
            <span class="notes"> &mdash; {encounter.notes}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .keyed-encounters ul {
    margin-bottom: 0;
  }

  .trigger {
    font-style: italic;
    color: var(--bulma-text-weak);
  }

  .notes {
    color: var(--bulma-text);
  }
</style>
