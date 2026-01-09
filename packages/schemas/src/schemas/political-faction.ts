import { z } from 'zod';

export const PoliticalFactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  gmNotes: z.string().optional(),
  secret: z.boolean().optional(),
  leadership: z.array(z.string()).optional(),
  allies: z.array(z.string()).optional(),
});

export type PoliticalFactionData = z.infer<typeof PoliticalFactionSchema>;
