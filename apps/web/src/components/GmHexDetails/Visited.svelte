<script lang="ts">
  import { faSquare, faSquareCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';

  import type { HexData } from '@skyreach/schemas';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();

  const icon = $derived(hex.isVisited ? faSquareCheck : faSquare);
</script>

<div class="data-bar-cell">
  Visited:{' '}<FontAwesomeIcon {icon} />
</div>
