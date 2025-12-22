import { z } from 'zod';

/**
 * Enum for link types used in intelligence reports and hidden sites.
 * Maps to route helper functions in apps/web/src/config/routes.ts
 */
export const LinkTypeEnum = z.enum([
  'clue',
  'dungeon',
  'encounter',
  'faction',
  'hex',
  'region',
]);
export type LinkType = z.infer<typeof LinkTypeEnum>;

// Intelligence report row schema
export const IntelligenceReportRowSchema = z
  .object({
    roll: z.number().describe('Die result'),
    report: z.string().describe('Title/summary of the report'),
    linkType: LinkTypeEnum.optional().describe('Type of the linked content'),
    linkId: z.string().optional().describe('ID of the linked content'),
    sampleDialogue: z.string().describe('In-character delivery'),
    relevantConditions: z.string().describe('When this report is relevant'),
  })
  .refine(
    (data) => {
      // linkType and linkId must be both present or both absent
      const hasLinkType = data.linkType !== undefined;
      const hasLinkId = data.linkId !== undefined;
      return (hasLinkType && hasLinkId) || (!hasLinkType && !hasLinkId);
    },
    { message: 'linkType and linkId must both be present or both be absent' },
  )
  .describe('IntelligenceReportRowSchema');
export type IntelligenceReportRow = z.infer<typeof IntelligenceReportRowSchema>;

// Prithara variant schema
export const PritharaVariantSchema = z
  .object({
    name: z.string().describe('Variant name'),
    description: z.string().describe('Usage and connotation'),
  })
  .describe('PritharaVariantSchema');

export type PritharaVariant = z.infer<typeof PritharaVariantSchema>;

// Intelligence reports container schema
export const IntelligenceReportsSchema = z
  .object({
    instructions: z
      .string()
      .optional()
      .describe('When/how to use the table'),
    rows: z
      .array(IntelligenceReportRowSchema)
      .describe('Intelligence report rows'),
  })
  .describe('IntelligenceReportsSchema');

export type IntelligenceReports = z.infer<typeof IntelligenceReportsSchema>;

// Full roleplay book schema
export const RoleplayBookSchema = z
  .object({
    // Basic metadata
    name: z.string().describe('Display title'),
    keyword: z
      .string()
      .describe('Matching keyword for stat block IDs'),

    // Cultural overview
    culturalOverview: z
      .string()
      .describe('Multi-paragraph overview of the culture'),

    // Prithara variants
    pritharaVariants: z
      .array(PritharaVariantSchema)
      .optional()
      .describe('Language variants for "Prithara" (ancestral homeland)'),

    // RP & Voice notes
    rpVoiceNotes: z
      .array(z.string())
      .describe('Bullet points for voice/mannerism guidance'),

    // Lore hooks & hints
    loreHooks: z
      .array(z.string())
      .describe('Bullet points for plot hooks and world-building hints'),

    // Sample dialogue
    sampleDialogue: z
      .array(z.string())
      .describe('Example dialogue lines'),

    // Intelligence reports (optional)
    intelligenceReports: IntelligenceReportsSchema.optional().describe(
      'Dynamic content table (optional)',
    ),
  })
  .describe('RoleplayBookSchema');

export type RoleplayBookData = z.infer<typeof RoleplayBookSchema>;
