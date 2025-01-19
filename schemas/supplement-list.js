import { z } from 'zod';

export const SupplementSchema = z.object({
  id: z.string(),
  name: z.string(),
  pdfUrl: z.string().url(),
  purchaseUrl: z.string().url(),
});

export const SupplementListSchema = z.array(SupplementSchema);
