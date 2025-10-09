<script lang="ts">
  import { faSquare, faSquareCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import type { HexData } from '@skyreach/schemas';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();

  const icon = $derived(hex.isExplored ? faSquareCheck : faSquare);
</script>

<div class="data-bar-cell">
  Explored:{' '}<FontAwesomeIcon {icon} />
</div>
