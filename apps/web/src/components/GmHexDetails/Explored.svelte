<script lang="ts">
  import CheckBoxIcon from '../InteractiveMap/CheckBoxIcon.svelte';

  import type { HexData } from '@skyreach/schemas';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();
</script>

<div class="data-bar-cell">
  Explored:{' '}<CheckBoxIcon checked={hex.isExplored ?? false} />
</div>
