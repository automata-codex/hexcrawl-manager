import { z } from 'zod';

export const FloatingClueSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  reference: z
    .object({
      text: z.string(),
      url: z.string().url(),
    })
    .optional(),
  detailText: z.string().optional(),
  unlocks: z
    .array(z.string())
    .optional()
    .describe('Knowledge tree items unlocked'),
  tags: z.array(z.string()).optional(),
  fallback: z
    .object({
      trigger: z
        .string()
        .describe('When to trigger fallback (e.g., leaving a region)'),
      consequence: z.string().describe('What happens if clue goes unfound'),
    })
    .optional()
    .describe('Optional fallback trigger and consequence'),
  status: z
    .enum(['undiscovered', 'revealed', 'expired'])
    .default('undiscovered'),
  encounters: z
    .array(z.string())
    .optional()
    .describe('Encounters that may be use to reveal this clue'),
});
