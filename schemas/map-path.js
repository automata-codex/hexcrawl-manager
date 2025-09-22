import { z } from 'zod';

// Valid anchor directions
const AnchorEnum = z.enum([
  'northeast',
  'east',
  'southeast',
  'center',
  'northwest',
  'west',
  'southwest',
  'side1',
  'side2',
  'side3',
  'side4',
  'side5',
  'side6',
]);

// Format: "R17:center"
const PointStringSchema = z
  .string()
  .regex(
    /^[a-z]\d{1,2}:(northeast|east|southeast|center|northwest|west|southwest|side1|side2|side3|side4|side5|side6)$/,
  );

// Segment metadata (customizable as needed)
export const SegmentMetadataSchema = z.object({
  impedesTravel: z.boolean().optional(),
  // other per-segment flags can go here, e.g.:
  // elevationChange: z.number().optional(),
});

// The main path entry schema
export const MapPathSchema = z.object({
  id: z.string(),
  type: z.enum(['river', 'unused-river', 'conduit', 'trail']), // add others as needed
  label: z.string().optional(),
  // color: z.string().optional(),
  // width: z.number().optional(),
  points: z.array(PointStringSchema).min(2), // at least 2 points required
  segmentMetadata: z
    .record(z.string().regex(/^\d+$/), SegmentMetadataSchema)
    .optional()
    .describe(
      'Segment metadata with keys like "0", "1", etc. to indicate the segment',
    ),
});
