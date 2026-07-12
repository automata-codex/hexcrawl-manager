<script lang="ts">
  import { getPerimeterEdges } from '@achm/core';

  import { layerVisibility } from '../../stores/interactive-map/layer-visibility';
  import {
    centroidOf,
    perimeterEdgesToSegments,
    REGION_BORDER_WIDTH,
  } from '../../utils/interactive-map.ts';

  import type { CoordinateNotation } from '@achm/core';

  interface OutlineGroup {
    id: string;
    hexes: string[];
    color: string;
    label?: string;
  }

  interface Props {
    groups: OutlineGroup[];
    layerKey: string;
    notation: CoordinateNotation;
    strokeWidth?: number;
    labelFont?: string | null;
  }

  let {
    groups,
    layerKey,
    notation,
    strokeWidth = REGION_BORDER_WIDTH,
    labelFont = null,
  }: Props = $props();

  // Project each group's hex set to outline segments + a centroid label position.
  const renderedGroups = $derived(
    groups.map((group) => ({
      id: group.id,
      color: group.color,
      label: group.label,
      labelPosition: group.label ? centroidOf(group.hexes, notation) : null,
      segments: perimeterEdgesToSegments(
        getPerimeterEdges(group.hexes, notation),
        notation,
      ),
    })),
  );
</script>

<g
  id={`layer-${layerKey}`}
  style:display={!$layerVisibility[layerKey] ? 'none' : undefined}
>
  {#each renderedGroups as group (group.id)}
    {#each group.segments as segment, index (index)}
      <line
        x1={segment.x1}
        y1={segment.y1}
        x2={segment.x2}
        y2={segment.y2}
        stroke={group.color}
        stroke-width={strokeWidth}
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/each}
    {#if group.label && group.labelPosition}
      <text
        x={group.labelPosition.x}
        y={group.labelPosition.y}
        font-family={labelFont}
        font-size="28"
        font-weight="bold"
        text-anchor="middle"
        dominant-baseline="middle"
        fill={group.color}
        stroke="white"
        stroke-width="3"
        paint-order="stroke"
      >
        {group.label}
      </text>
    {/if}
  {/each}
</g>
