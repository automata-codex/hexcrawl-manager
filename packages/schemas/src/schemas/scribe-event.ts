import { z } from 'zod';

export const ScribeEventSchema = z.object({
  seq: z.number().int().min(1), // 1..N within the file
  ts: z.string().datetime(), // ISO timestamp
  kind: z.string().min(1), // "move" | "scout" | ...
  payload: z.record(z.unknown()),
});

export type ScribeEvent = z.infer<typeof ScribeEventSchema>;
