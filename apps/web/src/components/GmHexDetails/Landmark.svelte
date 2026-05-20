<script lang="ts">
  import HexClueList from './HexClueList.svelte';

  import type { ClueMapEntry, ExtendedHexData } from '../../types.ts';

  interface Props {
    clueMap?: Record<string, ClueMapEntry>;
    hex: ExtendedHexData;
  }

  const { clueMap = {}, hex }: Props = $props();
  // TODO Handle a treasure entry in the landmark data structure

  const landmarkClues =
    typeof hex.landmark !== 'string' ? hex.landmark.clues : undefined;
</script>

<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>
  {@html hex.renderedLandmark}
  {#if landmarkClues && landmarkClues.length > 0}
    <div style="margin-left: 1rem">
      <HexClueList clues={landmarkClues} {clueMap} />
    </div>
  {/if}
</div>
