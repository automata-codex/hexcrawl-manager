<script lang="ts">
  import { faArrowDownToBracket } from '@fortawesome/pro-light-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { Canvg } from 'canvg';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';

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
    fullMap: boolean = false
  ) {
    const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;

    // Remove transforms if exporting full map
    if (fullMap) {
      clonedSvg.removeAttribute('viewBox'); // optional, depends on your setup
      clonedSvg.setAttribute('width', String(svgElement.scrollWidth || svgElement.clientWidth));
      clonedSvg.setAttribute('height', String(svgElement.scrollHeight || svgElement.clientHeight));
    } else {
      // Otherwise, preserve current visual size
      clonedSvg.setAttribute('width', String(svgElement.clientWidth));
      clonedSvg.setAttribute('height', String(svgElement.clientHeight));
    }

    // Serialize and prepare canvas
    const svgString = new XMLSerializer().serializeToString(clonedSvg);
    const canvas = document.createElement('canvas');
    canvas.width = parseInt(clonedSvg.getAttribute('width') || '800', 10);
    canvas.height = parseInt(clonedSvg.getAttribute('height') || '600', 10);

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    const v = Canvg.fromString(ctx, svgString);
    await v.render();

    // Trigger download
    canvas.toBlob(blob => {
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
<style>
    .open-panel-button {
        height: 2.5rem;
        width: 2.5rem;
    }
</style>

<div class="dropdown is-right is-active" bind:this={dropdownRef}>
  <!-- Toggle Button -->
  <div class="dropdown-trigger">
    <button class="button open-panel-button" aria-haspopup="true" aria-controls="dropdown-menu" onclick={() => (isOpen = !isOpen)}>
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
