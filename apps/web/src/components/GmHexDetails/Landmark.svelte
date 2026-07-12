<script lang="ts">
  import HexBeatList from './HexBeatList.svelte';
  import HexClueList from './HexClueList.svelte';
  import HexRoleplayBookList from './HexRoleplayBookList.svelte';

  import type {
    BeatMapEntry,
    ClueMapEntry,
    ExtendedHexData,
    RoleplayBookMapEntry,
  } from '../../types.ts';

  interface Props {
    beatMap?: Record<string, BeatMapEntry>;
    clueMap?: Record<string, ClueMapEntry>;
    hex: ExtendedHexData;
    roleplayBookMap?: Record<string, RoleplayBookMapEntry>;
  }

  const {
    beatMap = {},
    clueMap = {},
    hex,
    roleplayBookMap = {},
  }: Props = $props();
  // TODO Handle a treasure entry in the landmark data structure

  const landmark = typeof hex.landmark !== 'string' ? hex.landmark : undefined;
  const landmarkClues = landmark?.clues;
  const landmarkBeats = landmark?.beats;
  const landmarkRoleplayBooks = landmark?.roleplayBooks;
</script>

<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>
  {@html hex.renderedLandmark}
  {#if (landmarkClues && landmarkClues.length > 0) || (landmarkBeats && landmarkBeats.length > 0) || (landmarkRoleplayBooks && landmarkRoleplayBooks.length > 0)}
    <div style="margin-left: 1rem">
      <HexClueList clues={landmarkClues} {clueMap} />
      <HexBeatList beats={landmarkBeats} {beatMap} />
      <HexRoleplayBookList
        roleplayBooks={landmarkRoleplayBooks}
        {roleplayBookMap}
      />
    </div>
  {/if}
</div>
