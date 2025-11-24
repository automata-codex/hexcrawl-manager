import { z } from 'zod';

export const CompositeArticleSectionSchema = z
  .object({
    articleId: z.string().describe('Reference to article id'),
    heading: z.string().optional().describe('Custom heading to display before section'),
    secure: z.boolean().describe('Whether to wrap in SecretContent'),
  })
  .describe('CompositeArticleSectionSchema');

export const CompositeArticleSchema = z
  .object({
    id: z.string().describe('Unique identifier'),
    slug: z.string().describe('Full URL path starting with /'),
    title: z.string().describe('Page title'),
    sections: z
      .array(CompositeArticleSectionSchema)
      .min(1)
      .describe('Sections to render'),
  })
  .describe('CompositeArticleSchema');

export type CompositeArticleSectionData = z.infer<
  typeof CompositeArticleSectionSchema
>;
export type CompositeArticleData = z.infer<typeof CompositeArticleSchema>;
