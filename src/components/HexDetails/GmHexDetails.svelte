<script lang="ts">
  import type { HexData } from '../../types.ts';
  import { getHexPath } from '../../utils/routes.ts';

  interface Props {
    hex: HexData;
    showSelfLink?: boolean;
  }

  const { hex, showSelfLink = true }: Props = $props();
</script>

{#if showSelfLink}
  <div>
    <a href={getHexPath(hex.id)}>View Hex</a>
  </div>
{/if}
