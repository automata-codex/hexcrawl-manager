<script lang="ts">
  import { layerVisibility } from '../../stores/interactive-map/layer-visibility';
  import { parseHexId } from '../../utils/hexes.ts';
  import {
    axialToPixel,
    DEG_TO_RAD,
    EDGE_OFFSET,
    HEX_HEIGHT,
    HEX_RADIUS,
  } from '../../utils/interactive-map.ts';

  import type { MapPathPlayerData } from '../../pages/api/map-paths.json.ts';
  import type { SegmentMetadataData } from '@achm/schemas';

  interface Props {
    paths: MapPathPlayerData[];
    type: 'conduit' | 'river' | 'trail';
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
    side1: {
      dx: 0,
      dy: -EDGE_OFFSET,
    },
    side2: {
      dx: EDGE_OFFSET * Math.sin(60 * DEG_TO_RAD),
      dy: -EDGE_OFFSET * Math.cos(60 * DEG_TO_RAD),
    },
    side3: {
      dx: EDGE_OFFSET * Math.sin(120 * DEG_TO_RAD),
      dy: -EDGE_OFFSET * Math.cos(120 * DEG_TO_RAD),
    },
    side4: {
      dx: 0,
      dy: EDGE_OFFSET,
    },
    side5: {
      dx: EDGE_OFFSET * Math.sin(240 * DEG_TO_RAD),
      dy: -EDGE_OFFSET * Math.cos(240 * DEG_TO_RAD),
    },
    side6: {
      dx: EDGE_OFFSET * Math.sin(300 * DEG_TO_RAD),
      dy: -EDGE_OFFSET * Math.cos(300 * DEG_TO_RAD),
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
    const [hexId, anchor] = point.split(':');
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

  function getColor() {
    switch (type) {
      case 'conduit':
        return '#911AE6';
      case 'river':
        return '#72C6E5';
      case 'trail':
        return 'pink';
      default:
        return '#000000';
    }
  }

  const lineSegments = $derived(
    paths
      .filter((path) => path.type === type)
      .flatMap((path) => {
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
      stroke={getColor()}
      stroke-width={4}
      stroke-linecap="round"
      stroke-dasharray={impedesTravel ? 'none' : '1, 8'}
    />
  {/each}
</g>
