<script lang="ts">
  import { faSquare, faSquareCheck } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import type { HexData } from '../../types';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();

  const icon = $derived(hex.isExplored ? faSquareCheck : faSquare);
</script>
{#if hex.hiddenSites && hex.hiddenSites.length > 0}
  <div class="data-bar-cell">
    Explored:{' '}<FontAwesomeIcon {icon} />
  </div>
{/if}
