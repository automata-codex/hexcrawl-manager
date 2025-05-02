<script>
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

  function axialToPixel(q, r) {
    const x = q * (0.75 * HEX_WIDTH);
    const y = HEX_HEIGHT * (r + 0.5 * (q % 2));
    return { x, y };
  }

  function hexPath(x, y) {
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

  function startPan(e) {
    isPanning = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function movePan(e) {
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

  function handleWheel(e) {
    const zoomFactor = 1.1;
    const direction = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
    zoom *= direction;
    e.preventDefault();
  }

  let svgEl;
  onMount(() => {
    svgWidth = svgEl.clientWidth;
    svgHeight = svgEl.clientHeight;
  });

</script>

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
