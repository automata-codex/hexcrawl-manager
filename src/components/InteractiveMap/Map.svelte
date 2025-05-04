<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import {
    applyZoomAtCenter,
    computeViewBox,
    mapView,
    panBy,
    updateSvgSizeAndPreserveCenter,
    updateZoomAtPoint,
  } from '../../stores/interactive-map/map-view';
  import svgDefs from 'virtual:svg-symbols';
  import type { HexData } from '../../types.ts';
  import { isValidHexId, parseHexId } from '../../utils/hexes.ts';

  interface Props {
    hexes: HexData[];
  }

  const { hexes }: Props = $props();

  // const hexA2 = hexes.find(h => h.id.toLowerCase() === 'a2');
  // console.log(`Hex A2: ${JSON.stringify(hexA2)}`);

  const HEX_WIDTH = 100;
  const HEX_HEIGHT = Math.sqrt(3) / 2 * HEX_WIDTH;
  const ICON_SIZE = 90;

  let isPanning = $state(false);
  let lastX = $state(0);
  let lastY = $state(0);
  let svgEl: SVGElement;

  let viewBox = $derived(computeViewBox($mapView));

  onMount(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        const height = entry.contentRect.height;
        updateSvgSizeAndPreserveCenter(width, height);
      }
    });
    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  function applyZoomDelta(direction: number) {
    applyZoomAtCenter(direction);
  }

  function axialToPixel(q: number, r: number) {
    const x = q * (0.75 * HEX_WIDTH);
    const y = HEX_HEIGHT * (r + 0.5 * ((q + 1) % 2));
    return { x, y };
  }

  function getHexColor(hex: HexData) {
    switch (hex.terrain) {
      case 'glacier':
        return '#FFFFFF'; // white
      case 'water':
        return '#1E90FF'; // dodger blue
    }

    switch (hex.vegetation) {
      case 'alpine-tundra':
        return '#666'; // dark gray
      case 'dense-forest':
        return '#006600'; // dark green
      case 'light-forest':
      case 'swamp':
        return '#009900'; // medium green
      case 'sparse-forest':
        return '#66CC66'; // light green
      case 'highland-bog':
      case 'marsh':
      case 'moors':
      case 'grasslands':
        return '#B8E49A';
      case 'rocky-highland':
        return '#999999'; // gray
      default:
        return '#D3D3D3'; // light gray
    }
  }

  function getTerrainIcon(terrain: string) {
    switch (terrain) {
      case 'mountains':
        return '#icon-mountains';
      case 'hills':
        return '#icon-hills';
      case 'highland-bog':
      case 'marsh':
      case 'moors':
      case 'swamp':
      case 'wetlands':
        return '#icon-wetlands';
      case 'peak':
        return '#icon-peak';
      default:
        return '#icon-default';
    }
  }

  function hexLabel(col: number, row: number): string {
    const colLabel = String.fromCharCode(65 + col); // A = 65
    return `${colLabel}${row + 1}`;
  }

  function hexPath(x: number, y: number) {
    const size = HEX_WIDTH / 2;
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 180 * (60 * i);
      const px = x + size * Math.cos(angle);
      const py = y + size * Math.sin(angle);
      points.push(`${px},${py}`);
    }
    return points.join(" ");
  }

  function handleMouseDown(e: MouseEvent) {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function handleMouseLeave() {
    isPanning = false;
  }

  function handleMouseMove(e: MouseEvent) {
    if (!isPanning) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    panBy(dx, dy);
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function handleMouseUp() {
    isPanning = false;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();

    const { svgWidth, svgHeight, centerX, centerY, zoom } = get(mapView);

    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const viewX = centerX - svgWidth / 2 / zoom;
    const viewY = centerY - svgHeight / 2 / zoom;

    const svgMouseX = viewX + (mouseX / svgWidth) * (svgWidth / zoom);
    const svgMouseY = viewY + (mouseY / svgHeight) * (svgHeight / zoom);

    updateZoomAtPoint(svgMouseX, svgMouseY, mouseX, mouseY, -Math.sign(e.deltaY));
  }
</script>
<style>
    .zoom-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        z-index: 100;
    }

    .zoom-controls button {
        font-size: 1.25rem;
        padding: 0.4em 0.6em;
        background: white;
        border: 1px solid #ccc;
        border-radius: 0.25em;
        cursor: pointer;
    }

    .zoom-controls button:hover {
        background: #eee;
    }
</style>

<div class="zoom-controls">
  <button onclick={() => applyZoomDelta(1)}>+</button>
  <button onclick={() => applyZoomDelta(-1)}>−</button>
</div>

<svg
  role="presentation"
  bind:this={svgEl}
  onmousedown={handleMouseDown}
  onmousemove={handleMouseMove}
  onmouseup={handleMouseUp}
  onmouseleave={handleMouseLeave}
  onwheel={handleWheel}
  viewBox={viewBox}
  width="100%"
  height="100%"
  xmlns="http://www.w3.org/2000/svg"
  style="background: #fafafa;"
>
  {@html svgDefs}

  {#each hexes as hex}
    {#if isValidHexId(hex.id)}
      {#key hex.id}
        {@const { q, r } = parseHexId(hex.id)}
        {@const { x, y } = axialToPixel(q, r)}
        <polygon
          points={hexPath(x, y)}
          fill={getHexColor(hex)}
          stroke="black"
          stroke-width="1"
        />
        <use
          href={getTerrainIcon(hex.terrain)}
          x={x - ICON_SIZE / 2}
          y={y - ICON_SIZE / 2}
          width={ICON_SIZE}
          height={ICON_SIZE}
        />
        <text
          x={x}
          y={y + (HEX_HEIGHT / 2) - 4}
          font-size="12"
          text-anchor="middle"
          fill="black"
        >
          {hexLabel(q, r)}
        </text>
      {/key}
    {/if}
  {/each}
</svg>
