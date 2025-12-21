<script lang="ts">
  import CheckBoxIcon from '../InteractiveMap/CheckBoxIcon.svelte';

  import type { HexData } from '@achm/schemas';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();
</script>

<div class="data-bar-cell">
  <span class="inline-heading">Explored:</span>{' '}<CheckBoxIcon checked={hex.isExplored ?? false} />
</div>
