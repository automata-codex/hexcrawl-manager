<script lang="ts">
  import type { ExtendedHexData, FlatKnowledgeTree } from '../../types.ts';
  import Unlocks from '../Unlocks.svelte';

  interface Props {
    hex: ExtendedHexData;
    knowledgeTrees: Record<string, FlatKnowledgeTree>;
  }

  const { hex, knowledgeTrees }: Props = $props();
  // TODO Handle a treasure entry in the landmark data structure
</script>
<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>{' '}
  {@html hex.renderedLandmark}
  {#if typeof hex.landmark !== 'string' && hex.landmark.unlocks}
    <div style="margin-left: 1rem">
      <Unlocks
        knowledgeTrees={knowledgeTrees}
        unlocks={hex.landmark.unlocks}
      />
    </div>
  {/if}
</div>
