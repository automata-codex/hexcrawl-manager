<script lang="ts">
  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import { axialToPixel, DEG_TO_RAD, HEX_HEIGHT, HEX_RADIUS } from '../../utils/interactive-map.ts';
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
    segmentMetadata?: SegmentMetadataData;
    parent: string;
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
    south: {
      dx: 0,
      dy: HEX_HEIGHT / 2,
    },
  };

  export function pointsToSegments(
    points: { x: number; y: number }[],
    segmentMetadata: Record<string, SegmentMetadataData> | undefined,
    pathName: string,
  ): Segment[] {
    const segments = [];

    for (let i = 0; i < points.length - 1; i++) {
      segments.push({
        index: i,
        from: points[i],
        to: points[i + 1],
        segmentMetadata: segmentMetadata?.[i],
        parent: pathName,
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
      return pointsToSegments(points, path.segmentMetadata, path.id);
    }),
  );
</script>
<g
  id={`layer-${type}`}
  style:display={!$layerVisibility[type] ? 'none' : undefined}
>
  {#each lineSegments as segment (`${segment.parent}-${segment.index}`)}
    {@const impedesTravel = segment.segmentMetadata?.impedesTravel ?? true}
    <line
      x1={segment.from.x}
      y1={segment.from.y}
      x2={segment.to.x}
      y2={segment.to.y}
      stroke={'#72C6E5'}
      stroke-width={4}
      stroke-linecap="round"
      stroke-dasharray={impedesTravel ? 'none' : '1, 8'}
    />
  {/each}
</g>
