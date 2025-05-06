<script lang="ts">
  import { getHexSvgPath } from '../../utils/hexes.ts';

  interface Props {
    active?: boolean;
    hexId: string;
    hexWidth: number;
    onClick: (event: Event) => void;
    x: number;
    y: number;
  }

  const {
    active = false,
    hexId,
    hexWidth,
    onClick,
    x,
    y,
  }: Props = $props();

  function handleClick(event: Event) {
    event.stopPropagation();
    onClick(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      handleClick(event);
    }
  }
</script>
<style>
    polygon.active {
        stroke: gold;
        stroke-width: 3;
        filter: drop-shadow(0 0 6px gold);
        transition: stroke-width 0.1s ease, filter 0.2s ease;
    }
</style>
<polygon
  class:active={active}
  data-hexid={hexId}
  points={getHexSvgPath(x, y, hexWidth)}
  fill="transparent"
  stroke="none"
  role="button"
  tabindex={0}
  aria-label={`Hex ${hexId}`}
  onclick={handleClick}
  onkeydown={handleKeyDown}
/>
