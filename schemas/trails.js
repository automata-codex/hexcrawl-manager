import { z } from 'zod';

export const EdgeId = z
  .string()
  .toLowerCase()
  .regex(/^[a-z]+[0-9]+-[a-z]+[0-9]+$/, {
    message: "Edge id must be like 'q12-q13'",
  });

export const SeasonId = z
  .string()
  .regex(/^\d{4}-(spring|summer|autumn|winter)$/, {
    message: `Season must be "YYYY-(spring|summer|autumn|winter)"`,
  });

export const TrailSchema = z.object({
  permanent: z.boolean(),
  streak: z.number().int().min(0),
  usedThisSeason: z.boolean(),
  lastSeasonTouched: SeasonId,
});

export const TrailsFile = z.record(EdgeId, TrailSchema);

export const TrailEntrySchema = TrailSchema.extend({
  id: EdgeId,
});
