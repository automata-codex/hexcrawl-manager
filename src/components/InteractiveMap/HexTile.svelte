<script lang="ts">
  import { getHexSvgPath } from '../../utils/hexes.ts';

  interface Props {
    fill: string;
    hexWidth: number;
    x: number;
    y: number;
  }

  const {
    fill = '#CCC',
    hexWidth,
    x,
    y,
  }: Props = $props();
</script>
<polygon
  points={getHexSvgPath(x, y, hexWidth)}
  fill={fill}
  stroke={'black'}
  stroke-width={1}
/>
