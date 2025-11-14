import { z } from 'zod';

const DamageTypeSchema = z.enum([
  'acid',
  'bludgeoning',
  'cold',
  'fire',
  'force',
  'lightning',
  'necrotic',
  'piercing',
  'poison',
  'psychic',
  'radiant',
  'slashing',
  'thunder',
]);

export const DescriptiveActionSchema = z.object({
  name: z.string(),
  action_type: z.literal('descriptive'),
  desc: z.string(),
  recharge: z.string().optional(),
});

export const MeleeWeaponAttackSchema = z.object({
  name: z.string(),
  action_type: z.literal('melee weapon attack'),
  desc: z.string().optional(),
  use_desc: z.boolean().optional(), // If true, display the description before the attack details
  additional_damage_dice: z.string().optional(),
  additional_damage_type: DamageTypeSchema.optional(),
  additional_default_damage: z.number().int().positive().optional(),
  additional_text: z.string().optional(),
  attack_bonus: z.number(),
  damage_bonus: z.number().nullable(),
  damage_dice: z.string(),
  damage_type: DamageTypeSchema,
  default_damage: z.number(),
  reach: z.string(),
  recharge: z.string().optional(),
});

export const RangedWeaponAttackSchema = z.object({
  name: z.string(),
  action_type: z.literal('ranged weapon attack'),
  desc: z.string().optional(),
  use_desc: z.boolean().optional(), // If true, display the description before the attack details
  additional_damage_dice: z.string().optional(),
  additional_damage_type: DamageTypeSchema.optional(),
  additional_default_damage: z.number().int().positive().optional(),
  additional_text: z.string().optional(),
  attack_bonus: z.number(),
  damage_bonus: z.number(),
  damage_dice: z.string(),
  damage_type: DamageTypeSchema,
  default_damage: z.number(),
  range: z.string(),
  recharge: z.string().optional(),
});

export const SpecialActionSchema = z.object({
  name: z.string(),
  action_type: z.literal('special'),
  desc: z.string(),
  recharge: z.string().optional(),
});

export const BonusActionSchema = z.object({
  name: z.string(),
  desc: z.string().optional(),
});

export const SkillsSchema = z.object({
  acrobatics: z.number().int().positive().optional(),
  animal_handling: z.number().int().positive().optional(),
  arcana: z.number().int().positive().optional(),
  athletics: z.number().int().positive().optional(),
  deception: z.number().int().positive().optional(),
  history: z.number().int().positive().optional(),
  insight: z.number().int().positive().optional(),
  intimidation: z.number().int().positive().optional(),
  investigation: z.number().int().positive().optional(),
  medicine: z.number().int().positive().optional(),
  nature: z.number().int().positive().optional(),
  perception: z.number().int().positive().optional(),
  performance: z.number().int().positive().optional(),
  persuasion: z.number().int().positive().optional(),
  religion: z.number().int().positive().optional(),
  sleight_of_hand: z.number().int().positive().optional(),
  stealth: z.number().int().positive().optional(),
  survival: z.number().int().positive().optional(),
});

const ActionSchema = z.union([
  DescriptiveActionSchema,
  MeleeWeaponAttackSchema,
  RangedWeaponAttackSchema,
  SpecialActionSchema,
]);

export const StatBlockSchema = z.object({
  id: z.string(),
  slug: z.string().optional(),
  desc: z.string().optional(),
  name: z.string(),
  size: z.enum(['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan']),
  type: z.enum([
    'aberration',
    'beast',
    'celestial',
    'construct',
    'dragon',
    'elemental',
    'fey',
    'fiend',
    'giant',
    'humanoid',
    'monstrosity',
    'ooze',
    'plant',
    'undead',
  ]),
  subtype: z.string().optional(),
  group: z.string().nullable().optional(),
  family: z.string().nullable().optional(),
  family_name: z.string().nullable().optional(),
  alignment: z.enum([
    'any',
    'unaligned',
    'any non-lawful alignment',
    'lawful good',
    'neutral good',
    'chaotic good',
    'lawful neutral',
    'neutral',
    'chaotic neutral',
    'lawful evil',
    'neutral evil',
    'chaotic evil',
  ]),
  armor_class: z.number(),
  armor_desc: z.string().nullable().optional(),
  hit_points: z.number(),
  hit_dice: z.string(),
  speed: z.object({
    burrow: z.number().optional(),
    climb: z.number().optional(),
    fly: z.number().optional(),
    hover: z.boolean().optional(),
    swim: z.number().optional(),
    walk: z.number().optional(),
  }),
  strength: z.number(),
  dexterity: z.number(),
  constitution: z.number(),
  intelligence: z.number(),
  wisdom: z.number(),
  charisma: z.number(),
  strength_save: z.number().nullable().optional(),
  dexterity_save: z.number().nullable().optional(),
  constitution_save: z.number().nullable().optional(),
  intelligence_save: z.number().nullable().optional(),
  wisdom_save: z.number().nullable().optional(),
  charisma_save: z.number().nullable().optional(),
  perception: z.number().nullable().optional(),
  skills: SkillsSchema.optional(),
  proficiency_bonus: z.number().int().positive(),
  damage_vulnerabilities: z.string().optional(),
  damage_resistances: z.string().optional(),
  damage_immunities: z.string().optional(),
  condition_immunities: z.string().optional(),
  senses: z.string(),
  languages: z.string(),
  challenge_rating: z.string(),
  cr: z.number(),
  actions: z.array(ActionSchema),
  bonus_actions: z.array(BonusActionSchema).nullable().optional(),
  reactions: z
    .array(
      z.object({
        name: z.string(),
        desc: z.string(),
      }),
    )
    .nullable()
    .optional(),
  legendary_desc: z.string().optional(),
  legendary_actions: z.array(z.string()).nullable().optional(),
  special_abilities: z
    .array(
      z.object({
        name: z.string(),
        desc: z.string(),
        recharge: z.string().optional(),
      }),
    )
    .nullable(),
  spell_list: z.array(z.string()),
  page_no: z.number().nullable(),
  environments: z.array(
    z.enum([
      'arctic',
      'coastal',
      'desert',
      'forest',
      'grassland',
      'hill',
      'mountain',
      'swamp',
      'underdark',
      'underwater',
      'urban',
    ]),
  ),
  img_main: z.string().nullable().optional(),
  document__slug: z.string().optional(),
  document__title: z.string().optional(),
  document__license_url: z.string().optional(),
  document__url: z.string().optional(),
  v2_converted_path: z.string().optional(),
});

export type DescriptiveActionData = z.infer<typeof DescriptiveActionSchema>;
export type MeleeWeaponAttackData = z.infer<typeof MeleeWeaponAttackSchema>;
export type RangedWeaponAttackData = z.infer<typeof RangedWeaponAttackSchema>;
export type SpecialActionData = z.infer<typeof SpecialActionSchema>;
export type BonusActionData = z.infer<typeof BonusActionSchema>;
export type StatBlockData = z.infer<typeof StatBlockSchema>;
export type StatBlockSkillsData = z.infer<typeof SkillsSchema>;
