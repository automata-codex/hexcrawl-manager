<script lang="ts">
  import { getHexSvgPath } from '../../utils/hexes.ts';

  interface Props {
    fill?: string;
    hexWidth: number;
    stroke?: string;
    x: number;
    y: number;
  }

  const {
    fill = '#CCC',
    hexWidth,
    stroke = 'black',
    x,
    y,
  }: Props = $props();
</script>
<polygon
  points={getHexSvgPath(x, y, hexWidth)}
  fill={fill}
  stroke={stroke}
  stroke-width={1}
/>
