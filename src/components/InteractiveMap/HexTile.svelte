<script lang="ts">
  interface Props {
    active?: boolean;
    fill: string;
    hexId: string;
    hexWidth: number;
    onClick: (event: Event) => void;
    x: number;
    y: number;
  }

  const {
    active = false,
    fill = '#CCC',
    hexId,
    hexWidth,
    onClick,
    x,
    y,
  }: Props = $props();

  function hexPath(x: number, y: number) {
    const size = hexWidth / 2;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    return points.join(" ");
  }

  function handleActivate(event: Event) {
    event.stopPropagation();
    onClick(event);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      handleActivate(event);
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
  points={hexPath(x, y)}
  fill={fill}
  stroke={'black'}
  stroke-width={1}
  role="button"
  tabindex={0}
  aria-label={`Hex ${hexId}`}
  onclick={handleActivate}
  onkeydown={handleKeyDown}
/>
