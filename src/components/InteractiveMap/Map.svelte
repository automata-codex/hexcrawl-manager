<script lang="ts">
  import { onMount } from 'svelte';

  const HEX_WIDTH = 100;
  const HEX_HEIGHT = Math.sqrt(3) / 2 * HEX_WIDTH;

  // Sample data — just a 10x10 grid
  let hexes = [];
  for (let q = 0; q < 10; q++) {
    for (let r = 0; r < 10; r++) {
      hexes.push({ q, r });
    }
  }

  function axialToPixel(q: number, r: number) {
    const x = q * (0.75 * HEX_WIDTH);
    const y = HEX_HEIGHT * (r + 0.5 * ((q + 1) % 2));
    return { x, y };
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

  // Initial viewBox center and zoom
  let centerX = $state(400);
  let centerY = $state(400);
  let zoom = $state(1);
  let svgWidth = $state(800);
  let svgHeight = $state(800);

  let viewBox = $derived(`${centerX - svgWidth / 2 / zoom} ${centerY - svgHeight / 2 / zoom} ${svgWidth / zoom} ${svgHeight / zoom}`);

  let isPanning = $state(false);
  let lastX = $state(0);
  let lastY = $state(0);

  function startPan(e: MouseEvent) {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function movePan(e: MouseEvent) {
    if (!isPanning) return;
    const dx = (e.clientX - lastX) / zoom;
    const dy = (e.clientY - lastY) / zoom;
    centerX = centerX - dx;
    centerY = centerY - dy;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function endPan() {
    isPanning = false;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    e.stopPropagation();

    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Current view top-left in SVG coords
    const viewX = centerX - svgWidth / 2 / zoom;
    const viewY = centerY - svgHeight / 2 / zoom;

    // Mouse point in SVG coords before zoom
    const svgMouseX = viewX + (mouseX / svgWidth) * (svgWidth / zoom);
    const svgMouseY = viewY + (mouseY / svgHeight) * (svgHeight / zoom);

    // Zoom update
    zoom *= direction;

    // New view top-left after zoom
    const newViewWidth = svgWidth / zoom;
    const newViewHeight = svgHeight / zoom;

    // Recompute center so svgMouseX/Y stays under the cursor
    centerX = svgMouseX - (mouseX / svgWidth) * newViewWidth + newViewWidth / 2;
    centerY = svgMouseY - (mouseY / svgHeight) * newViewHeight + newViewHeight / 2;
  }

  let svgEl: SVGElement;
  onMount(() => {
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        const newHeight = entry.contentRect.height;

        // Adjust center to preserve current center of screen in SVG coords
        const oldViewWidth = svgWidth / zoom;
        const oldViewHeight = svgHeight / zoom;
        const newViewWidth = newWidth / zoom;
        const newViewHeight = newHeight / zoom;

        const viewX = centerX - oldViewWidth / 2;
        const viewY = centerY - oldViewHeight / 2;

        centerX = viewX + newViewWidth / 2;
        centerY = viewY + newViewHeight / 2;

        svgWidth = newWidth;
        svgHeight = newHeight;
      }
    });

    resizeObserver.observe(svgEl);
    return () => resizeObserver.disconnect();
  });

  let mouseScreenX = $state(0);
  let mouseScreenY = $state(0);
  let svgMouseX = $state(0);
  let svgMouseY = $state(0);

</script>
<div style="position: absolute; top: 0; left: 0; background: white; padding: 0.5em; font-family: monospace; z-index: 1000;">
  Mouse: {mouseScreenX}, {mouseScreenY}<br />
  SVG: {svgMouseX.toFixed(2)}, {svgMouseY.toFixed(2)}<br />
  Center: {centerX.toFixed(2)}, {centerY.toFixed(2)}<br />
  Zoom: {zoom.toFixed(2)}
</div>

<svg
  role="presentation"
  bind:this={svgEl}
  onmousedown={startPan}
  onmousemove={movePan}
  onmouseup={endPan}
  onmouseleave={endPan}
  onwheel={handleWheel}
  viewBox={viewBox}
  width="100%"
  height="100%"
  xmlns="http://www.w3.org/2000/svg"
  style="background: #fafafa;"
>
  {#each hexes as { q, r }}
    {#key `${q},${r}`}
      {@const { x, y } = axialToPixel(q, r)}
      <polygon
        points={hexPath(x, y)}
        fill="lightblue"
        stroke="black"
        stroke-width="1"
      />
      <text
        x={x}
        y={y + 4}
        font-size="12"
        text-anchor="middle"
        fill="black"
      >
        {q},{r}
      </text>
    {/key}
  {/each}
</svg>
