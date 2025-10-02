<script lang="ts">
  import { faArrowDownToBracket } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { Canvg } from 'canvg';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  import { canAccess } from '../../utils/auth.ts';
  import { SCOPES } from '../../utils/constants.ts';

  interface Props {
    role: string | null;
  }

  const { role }: Props = $props();

  let isOpen = $state(false);
  let dropdownRef: HTMLDivElement | null = $state(null);

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  });

  async function exportCurrentView() {
    const svgElement = document.querySelector('#map') as SVGSVGElement;
    if (!svgElement) return;

    // Export the current view
    await exportSvgAsPng(svgElement, 'current-view.png');

    isOpen = false;
  }

  async function exportFullMap() {
    const svgElement = document.querySelector('#map') as SVGSVGElement;
    if (!svgElement) return;

    // Export the full map
    await exportSvgAsPng(svgElement, 'full-map.png', true);

    isOpen = false;
  }

  async function exportSvgAsPng(
    svgElement: SVGSVGElement,
    fileName: string = 'map.png',
    fullMap: boolean = false,
  ) {
    // Clone the original SVG so we can modify it
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    let width: number,
      height: number,
      offsetX = 0,
      offsetY = 0;

    if (fullMap) {
      const inner = svgElement.querySelector('#map-content');
      if (!(inner instanceof SVGGraphicsElement)) {
        throw new Error('#map-content is not an SVGGraphicsElement');
      }

      const bbox = inner.getBBox(); // includes negative coords!
      width = Math.ceil(bbox.width);
      height = Math.ceil(bbox.height);
      offsetX = Math.floor(bbox.x);
      offsetY = Math.floor(bbox.y);

      // Set appropriate width/height on the clone
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      clonedSvg.setAttribute(
        'viewBox',
        `${offsetX} ${offsetY} ${width} ${height}`,
      );
    } else {
      width = svgElement.clientWidth;
      height = svgElement.clientHeight;
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
    }

    const svgString = new XMLSerializer().serializeToString(clonedSvg);

    // Set up canvas
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const v = Canvg.fromString(ctx, svgString);
    await v.render();

    // Download as PNG
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  function handleClickOutside(event: MouseEvent) {
    if (dropdownRef && !dropdownRef.contains(event.target as Node)) {
      isOpen = false;
    }
  }
</script>

{#if canAccess(role, [SCOPES.GM])}
  <div class="dropdown is-right is-active" bind:this={dropdownRef}>
    <!-- Toggle Button -->
    <div class="dropdown-trigger">
      <button
        class="button open-panel-button"
        aria-haspopup="true"
        aria-controls="dropdown-menu"
        onclick={() => (isOpen = !isOpen)}
      >
        <FontAwesomeIcon icon={faArrowDownToBracket} />
      </button>
    </div>

    <!-- Dropdown Menu -->
    {#if isOpen}
      <div class="dropdown-menu" id="dropdown-menu" role="menu" transition:fade>
        <div class="dropdown-content">
          <button class="dropdown-item" onclick={exportCurrentView}>
            Export Current View
          </button>
          <button class="dropdown-item" onclick={exportFullMap}>
            Export Full Map
          </button>
        </div>
      </div>
    {/if}
  </div>
{:else}
  <button class="button open-panel-button" onclick={exportCurrentView}>
    <FontAwesomeIcon icon={faArrowDownToBracket} />
  </button>
{/if}

<style>
  .open-panel-button {
    height: 2.5rem;
    width: 2.5rem;
  }
</style>
