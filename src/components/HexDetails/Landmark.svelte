<script lang="ts">
  import type { HexData } from '../../types.ts';
  import { renderBulletMarkdown } from '../../utils/markdown.ts';

  interface Props {
    hex: HexData;
  }

  const { hex }: Props = $props();
  // const content = $derived.by(async () => await renderBulletMarkdown(hex.landmark));
  const content = await renderBulletMarkdown(hex.landmark);
</script>
<div class="hanging-indent">
  <span class="inline-heading">Landmark:</span>{' '}
  {@html content}
</div>
