import { z } from 'zod';

import { ClassEnum } from './class-enum';

export const SpellSchoolEnum = z.enum([
  'Abjuration',
  'Conjuration',
  'Divination',
  'Enchantment',
  'Evocation',
  'Illusion',
  'Necromancy',
  'Transmutation',
]);

export const SpellComponentsSchema = z.object({
  verbal: z.boolean(),
  somatic: z.boolean(),
  material: z.string().optional().describe('Material component description, if required'),
});

export const SpellSchema = z
  .object({
    id: z.string().describe('Unique kebab-case identifier'),
    name: z.string(),
    type: z.string().describe('Display type (e.g., "Cantrip / Ritual", "3rd-level Evocation")'),
    school: SpellSchoolEnum,
    level: z.number().int().min(0).max(9).describe('Spell level (0 for cantrips)'),
    castingTime: z.string(),
    range: z.string(),
    components: SpellComponentsSchema,
    duration: z.string(),
    concentration: z.boolean(),
    ritual: z.boolean(),
    classes: z.array(ClassEnum).describe('D&D classes that can cast this spell'),
    source: z.string().describe('Origin of the spell (e.g., "Velari Technique", "PHB")'),
    summary: z.string().describe('Brief one-line description'),
    description: z.string().describe('Full spell description'),
    mechanicalNotes: z.string().optional().describe('Game mechanics and rules clarifications'),
    atHigherLevels: z.string().nullable().describe('Effects when cast at higher levels'),
    tags: z.array(z.string()).describe('Categorization tags for filtering'),
    knowledgeUnlocks: z
      .array(z.string())
      .optional()
      .describe('Knowledge nodes unlocked by learning this spell'),
    relatedSpells: z
      .array(z.string())
      .optional()
      .describe('IDs of related spells'),
  })
  .describe('SpellSchema');

export type SpellData = z.infer<typeof SpellSchema>;
export type SpellSchool = z.infer<typeof SpellSchoolEnum>;
export type SpellComponents = z.infer<typeof SpellComponentsSchema>;
