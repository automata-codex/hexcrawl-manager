<script lang="ts">
  import type { ExtendedHexData } from '../../types.ts';

  interface Props {
    hex: ExtendedHexData;
  }

  const { hex }: Props = $props();
</script>
<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>{' '}
  {@html hex.renderedLandmark}
</div>
