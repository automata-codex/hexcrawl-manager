import { z } from 'zod';

export const ImageSchema = z.object({
  filename: z.string(),
  description: z.string(),
  display: z.boolean().optional(),
});

export type ImageData = z.infer<typeof ImageSchema>;
