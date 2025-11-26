import type { TraversalTimeData, TraversalSegmentData } from '@skyreach/schemas';

function formatSegment(segment: TraversalSegmentData): string {
  const time = `${segment.count} ${segment.unit}`;
  if (segment.direction) {
    return `${time} going ${segment.direction}`;
  }
  return time;
}

export function formatTraversalTime(time: TraversalTimeData): string {
  if (Array.isArray(time) && time.length === 2) {
    // Asymmetric: tuple of two segments
    return `${formatSegment(time[0])}, ${formatSegment(time[1])}`;
  }
  // Symmetric: single segment
  return formatSegment(time as TraversalSegmentData);
}
