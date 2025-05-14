import { z } from "zod";

export const TrailSchema = z.object({
  from: z.string(),             // e.g., "T15"
  to: z.string(),               // e.g., "T16"
  uses: z.number().int().min(0),
  isMarked: z.boolean(),       // true only before trail becomes visible
  lastUsed: z.string(),        // ISO or campaign date string
  markedBy: z.string().optional(), // optional: party ID or name
  notes: z.string().optional(),    // freeform GM notes
});

// Inferred TypeScript type
