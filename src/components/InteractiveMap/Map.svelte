<script>
  // Optional: width and height of your box
  const boxSize = 100;
</script>

<svg
  width="100%"
  height="100%"
  viewBox="0 0 500 500"
  xmlns="http://www.w3.org/2000/svg"
  style="background: #f0f0f0;"
>
  <!-- Red square centered in the viewBox -->
  <rect
    x={(500 - boxSize) / 2}
    y={(500 - boxSize) / 2}
    width={boxSize}
    height={boxSize}
    fill="red"
  />
</svg>
