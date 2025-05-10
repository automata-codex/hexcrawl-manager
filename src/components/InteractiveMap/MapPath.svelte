<script lang="ts">
  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import { axialToPixel, DEG_TO_RAD, HEX_RADIUS } from '../../utils/interactive-map.ts';
  import { parseHexId } from '../../utils/hexes.ts';
  import { layerVisibility } from '../../stores/interactive-map/layer-visibility';
  import type { SegmentMetadataData } from '../../types.ts';

  interface Props {
    paths: MapPathPlayerData[];
    type: 'river';
  }

  interface Segment {
    index: number;
    from: { x: number; y: number };
    to: { x: number; y: number };
    metadata?: SegmentMetadataData;
  }

  let { paths, type }: Props = $props();

  const ANCHOR_OFFSETS = {
    center: { dx: 0, dy: 0 },
    northeast: {
      dx: HEX_RADIUS * Math.sin(30 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(30 * DEG_TO_RAD),
    },
    east: {
      dx: HEX_RADIUS * Math.sin(90 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(90 * DEG_TO_RAD),
    },
    southeast: {
      dx: HEX_RADIUS * Math.sin(150 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(150 * DEG_TO_RAD),
    },
    southwest: {
      dx: HEX_RADIUS * Math.sin(210 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(210 * DEG_TO_RAD),
    },
    west: {
      dx: HEX_RADIUS * Math.sin(270 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(270 * DEG_TO_RAD),
    },
    northwest: {
      dx: HEX_RADIUS * Math.sin(330 * DEG_TO_RAD),
      dy: -HEX_RADIUS * Math.cos(330 * DEG_TO_RAD),
    },
  };

  export function pointsToSegments(
    points: { x: number; y: number }[],
    segmentMetadata?: Record<string, SegmentMetadataData>,
  ): Segment[] {
    const segments = [];

    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        index: i,
        from: points[i],
        to: points[i + 1],
        metadata: segmentMetadata?.[i],
      });
    }

    return segments;
  }

  function resolvePathPoint(point: string): { x: number; y: number } {
    const [ hexId, anchor ] = point.split(':');
    const { q, r } = parseHexId(hexId);

    const { x: baseX, y: baseY } = axialToPixel(q, r);

    const offset = ANCHOR_OFFSETS[anchor as keyof typeof ANCHOR_OFFSETS];
    if (!offset) {
      throw new Error(`Unknown anchor '${anchor}'`);
    }

    return {
      x: baseX + offset.dx,
      y: baseY + offset.dy,
    };
  }

  const lineSegments = $derived(
    paths.flatMap((path) => {
      const points = path.points.map(resolvePathPoint);
      return pointsToSegments(points, path.metadata);
    }),
  );
</script>
<g
  id={`layer-${type}`}
  style:display={!$layerVisibility[type] ? 'none' : undefined}
>
  {#each lineSegments as segment (segment.index)}
    <line
      x1={segment.from.x}
      y1={segment.from.y}
      x2={segment.to.x}
      y2={segment.to.y}
      stroke={'#72C6E5'}
      stroke-width={4}
      stroke-dasharray={segment.metadata?.impedesTravel ? '4 2' : 'none'}
    />
  {/each}
</g>
