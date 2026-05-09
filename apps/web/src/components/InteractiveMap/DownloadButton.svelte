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

  const EXPORT_DPI = 300;
  const SCREEN_DPI = 96;
  const EXPORT_SCALE = EXPORT_DPI / SCREEN_DPI;

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

    // Set up canvas at EXPORT_DPI by oversampling pixels relative to the SVG's
    // logical size, then scaling the drawing context so vector content is
    // rendered crisply at the higher resolution.
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * EXPORT_SCALE);
    canvas.height = Math.round(height * EXPORT_SCALE);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

    const v = Canvg.fromString(ctx, svgString);
    await v.render();

    // Download as PNG with a pHYs chunk so viewers/print software recognize
    // the export as EXPORT_DPI rather than the canvas default of 96 DPI.
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const png = new Uint8Array(await blob.arrayBuffer());
      const tagged = injectPngDpi(png, EXPORT_DPI);
      const url = URL.createObjectURL(
        new Blob([tagged], { type: 'image/png' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  // Inserts a pHYs chunk after IHDR to mark the PNG with the requested DPI.
  // PNG layout: 8-byte signature, then IHDR (length 4 + type 4 + data 13 +
  // crc 4 = 25 bytes), so IHDR ends at offset 33.
  function injectPngDpi(png: Uint8Array, dpi: number): Uint8Array {
    const ihdrEnd = 33;
    const ppm = Math.round(dpi * 39.3701); // pixels per meter

    const chunk = new Uint8Array(4 + 4 + 9 + 4);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, 9, false); // data length
    chunk.set([0x70, 0x48, 0x59, 0x73], 4); // 'pHYs'
    view.setUint32(8, ppm, false); // x ppm
    view.setUint32(12, ppm, false); // y ppm
    chunk[16] = 1; // unit specifier: meters
    view.setUint32(17, crc32(chunk.subarray(4, 17)), false);

    const out = new Uint8Array(png.length + chunk.length);
    out.set(png.subarray(0, ihdrEnd), 0);
    out.set(chunk, ihdrEnd);
    out.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
    return out;
  }

  const CRC32_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(buf: Uint8Array): number {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = CRC32_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
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

  .open-panel-button:hover {
    background: #888;
  }

  /* Light mode - explicit theme selection */
  :global(html[data-theme='light']) .open-panel-button:hover {
    background: #ddd;
  }

  /* Light mode - system preference when no explicit theme */
  @media (prefers-color-scheme: light) {
    :global(html:not([data-theme])) .open-panel-button:hover {
      background: #ddd;
    }
  }
</style>
