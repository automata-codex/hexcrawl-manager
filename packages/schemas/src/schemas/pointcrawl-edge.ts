import { z } from 'zod';

import { EncounterOverrideSchema } from './encounter-override';

const DirectionEnum = z.enum([
  'up',
  'down',
  'in',
  'out',
  'north',
  'northeast',
  'east',
  'southeast',
  'south',
  'southwest',
  'west',
  'northwest',
]);

const TraversalSegmentSchema = z.object({
  count: z.number().int().positive(),
  unit: z.enum(['minutes', 'hours']),
  direction: DirectionEnum.optional(),
});

const TraversalTimeSchema = z.union([
  TraversalSegmentSchema,
  z.tuple([TraversalSegmentSchema, TraversalSegmentSchema]),
]);

export const PointcrawlEdgeSchema = z
  .object({
    id: z.string().describe('Unique identifier within the pointcrawl'),
    pointcrawlId: z.string().describe('Reference to the parent pointcrawl'),
    label: z
      .string()
      .describe('Map label shown on the pointcrawl diagram (e.g., "1.A")'),
    from: z.string().describe('Source node ID'),
    fromLevel: z.number().int().describe('Level of the source node'),
    to: z.string().describe('Destination node ID'),
    toLevel: z
      .number()
      .int()
      .optional()
      .describe('Level of the destination node (defaults to fromLevel if omitted)'),
    traversalTime: TraversalTimeSchema.describe(
      'Time to traverse the edge; single segment for symmetric, tuple for asymmetric',
    ),
    encounters: z
      .array(z.string())
      .optional()
      .describe('Set encounter IDs (guaranteed to occur on this edge)'),
    encounterOverrides: EncounterOverrideSchema.optional().describe(
      'Overrides for random encounter tables',
    ),
  })
  .describe('An edge (connection) between nodes in a pointcrawl');

export type PointcrawlEdgeData = z.infer<typeof PointcrawlEdgeSchema>;
export type TraversalSegmentData = z.infer<typeof TraversalSegmentSchema>;
export type TraversalTimeData = z.infer<typeof TraversalTimeSchema>;
