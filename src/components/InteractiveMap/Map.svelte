<script lang="ts">
  import { faLocationCrosshairs, faMagnifyingGlassArrowsRotate } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import svgDefs from 'virtual:svg-symbols';
  import type { DungeonEssentialData } from '../../pages/api/dungeons.json.ts';
  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import { layerVisibility } from '../../stores/interactive-map/layer-visibility';
  import {
    applyZoomAtCenter,
    computeViewBox,
    mapView,
    panBy,
    resetZoom,
    updateSvgSizeAndPreserveCenter,
    updateZoomAtPoint,
  } from '../../stores/interactive-map/map-view';
  import { selectedHex } from '../../stores/interactive-map/selected-hex.ts';
  import type { HexData } from '../../types.ts';
  import { isValidHexId, parseHexId } from '../../utils/hexes.ts';
  import DetailPanel from './DetailPanel.svelte';
  import HexHitTarget from './HexHitTarget.svelte';
  import HexTile from './HexTile.svelte';
  import LayersPanel from './LayersPanel.svelte';
  import MapPath from './MapPath.svelte';
  import { axialToPixel, HEX_HEIGHT, HEX_WIDTH, ICON_SIZE } from '../../utils/interactive-map.ts';

  let dungeons: DungeonEssentialData[] = $state([]);
  let hexes: HexData[] = $state([]);
  let isPanning = $state(false);
  let lastX = $state(0);
  let lastY = $state(0);
  let rivers: MapPathPlayerData[] = $state([]);
  let svgEl: SVGElement;
  let wasPanning = $state(false);

  let viewBox = $derived(computeViewBox($mapView));

  onMount(() => {
    (async () => {
      const dungeonResponse = await fetch('/api/dungeons.json');
      dungeons = await dungeonResponse.json();
      const hexResponse = await fetch('/api/hexes.json');
      hexes = await hexResponse.json();
      const mapPathResponse = await fetch('/api/map-paths.json');
      const mapPaths = await mapPathResponse.json();
      rivers = mapPaths.filter((path: MapPathPlayerData) => path.type === 'river');
    })();

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

  function getBiomeColor(biome: string): string {
    switch (biome) {
      case 'alpine-tundra': return '#A8C9D6';
      case 'boreal-forest': return '#4C6E5C';
      case 'coastal-ocean': return '#2E8BC0';
      case 'coastal-prairie': return '#A9C77D';
      case 'coastal-swamp': return '#4E948F';
      case 'freshwater-lake': return '#72C6E5';
      case 'glacier': return '#DDF1F9';
      case 'highland-bog': return '#7E8D77';
      case 'marsh': return '#507D6A';
      case 'mixed-woodland': return '#8BBF8E';
      case 'montane-forest': return '#2F6D4A';
      case 'montane-grassland': return '#B7B767';
      case 'moors': return '#A4A78A';
      case 'prairie': return '#CABF61';
      case 'rocky-highland': return '#999688';
      case 'subalpine-woodland': return '#6BAF84';
      case 'swamp': return '#3F9F9F';
      case 'temperate-forest': return '#5FA973';
      case 'temperate-rainforest': return '#3E7D4E';
      case 'temperate-woodland': return '#73B87D';
      default: return '#CCCCCC';
    }
  }

  function getElevationColor(elevation: number | null | undefined): string {
    if (elevation == null || isNaN(elevation)) return '#999';

    const minElevation = 0;
    const maxElevation = 12000;

    const clamped = Math.max(minElevation, Math.min(elevation, maxElevation));

    // Map elevation linearly across 360° hue wheel
    const hue = ((clamped - minElevation) / (maxElevation - minElevation)) * 360;

    // Optional: tweak these for visual clarity
    const saturation = 70;
    const lightness = 60;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
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

  function handleHexClick(e: Event) {
    if (wasPanning) return; // suppress accidental clicks after pan

    const hexId = (e.currentTarget as SVGElement)?.dataset?.hexid;
    if (hexId) {
      if ($selectedHex === hexId) {
        selectedHex.set(null);
      } else {
        selectedHex.set(hexId);
      }
    }
  }

  function handleCenterSelectedHexClick() {
    if ($selectedHex) {
      const { q, r } = parseHexId($selectedHex);
      const { x, y } = axialToPixel(q, r);

      mapView.update(state => ({
        ...state,
        centerX: x,
        centerY: y,
      }));
    }
  }

  function handleMouseDown(e: MouseEvent) {
    isPanning = true;
    wasPanning = false;
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
    wasPanning = true;
  }

  function handleMouseUp() {
    isPanning = false;

    // Reset wasPanning after current frame so the hex-click handler can read it
    setTimeout(() => {
      wasPanning = false;
    }, 0);
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

  function handleZoomReset() {
    resetZoom();
  }

  function hexLabel(col: number, row: number): string {
    const colLabel = String.fromCharCode(65 + col); // A = 65
    return `${colLabel}${row + 1}`;
  }
</script>
<style>
    .map {
        width: 100%;
        height: 100%;
    }

    .map-container {
        width: 100vw;
        height: 100vh;
    }

    .zoom-controls {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        z-index: 100;
        align-items: flex-end;
    }

    .zoom-controls button {
        font-size: 1.25rem;
        padding: 0.5rem;
        height: 2.5rem;
        width: 2.5rem;
        border-radius: 0.25em;
        cursor: pointer;
    }

    .zoom-controls button:hover {
        background: #888;
    }
</style>

<div class="zoom-controls">
  <button class="button" onclick={() => applyZoomDelta(1)}>+</button>
  <button class="button" onclick={() => applyZoomDelta(-1)}>−</button>
  <button class="button" onclick={handleCenterSelectedHexClick}>
    <FontAwesomeIcon icon={faLocationCrosshairs} />
  </button>
  <button class="button" onclick={handleZoomReset}>
    <FontAwesomeIcon icon={faMagnifyingGlassArrowsRotate} />
  </button>
  <div class="button">
    Zoom: {Math.round($mapView.zoom * 100)}%
  </div>
</div>

{#if hexes}
  <DetailPanel {dungeons} {hexes} />
{/if}

<LayersPanel />

<div class="map-container">
  <svg
    class="map"
    role="presentation"
    bind:this={svgEl}
    onmousedown={handleMouseDown}
    onmousemove={handleMouseMove}
    onmouseup={handleMouseUp}
    onmouseleave={handleMouseLeave}
    onwheel={handleWheel}
    viewBox={viewBox}
    xmlns="http://www.w3.org/2000/svg"
    style="background: #fafafa;"
  >
    {@html svgDefs}

    <g
      id="layer-vegetation"
      style:display={!$layerVisibility['vegetation'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexTile
            fill={getHexColor(hex)}
            hexWidth={HEX_WIDTH}
            stroke="none"
            {x}
            {y}
          />
        {/if}
      {/each}
    </g>
    <g
      id="layer-biomes"
      style:display={!$layerVisibility['biomes'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexTile
            fill={getBiomeColor(hex.biome)}
            hexWidth={HEX_WIDTH}
            stroke="none"
            {x}
            {y}
          />
        {/if}
      {/each}
    </g>
    <g
      id="layer-elevation"
      style:display={!$layerVisibility['elevation'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexTile
            fill={getElevationColor(hex.elevation)}
            hexWidth={HEX_WIDTH}
            stroke="none"
            {x}
            {y}
          />
        {/if}
      {/each}
    </g>
    <g
      id="layer-terrain"
      style:display={!$layerVisibility['terrain'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <use
            href={getTerrainIcon(hex.terrain)}
            x={x - ICON_SIZE / 2}
            y={y - ICON_SIZE / 2}
            width={ICON_SIZE}
            height={ICON_SIZE}
          />
        {/if}
      {/each}
    </g>
    <g
      id="layer-hex-borders"
      style:display={!$layerVisibility['hexBorders'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexTile
            fill="none"
            hexWidth={HEX_WIDTH}
            {x}
            {y}
          />
        {/if}
      {/each}
    </g>
    <MapPath paths={rivers} type="river" />
    <g
      id="layer-player-mask"
      style:display={'true'}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id) && !hex.isVisited}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexTile
            fill="white"
            hexWidth={HEX_WIDTH}
            {x}
            {y}
          />
        {/if}
      {/each}
    </g>
    <g
      id="layer-hex-labels"
      style:display={!$layerVisibility['labels'] ? 'none' : undefined}
    >
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <text
            x={x}
            y={y + (HEX_HEIGHT / 2) - 4}
            font-size="12"
            text-anchor="middle"
            fill="black"
          >
            {hexLabel(q, r)}
          </text>
        {/if}
      {/each}
    </g>
    <g id="layer-hit-target">
      {#each hexes as hex (hex.id)}
        {#if isValidHexId(hex.id)}
          {@const { q, r } = parseHexId(hex.id)}
          {@const { x, y } = axialToPixel(q, r)}
          <HexHitTarget
            active={$selectedHex === hex.id}
            hexId={hex.id}
            hexWidth={HEX_WIDTH}
            x={x}
            y={y}
            onClick={handleHexClick}
          />
        {/if}
      {/each}
    </g>
  </svg>
</div>
