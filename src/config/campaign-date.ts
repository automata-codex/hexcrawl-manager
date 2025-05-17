import { z } from 'zod';

// 🌟 Set the current in-world date here
const CURRENT_DATE = {
  currentDate: {
    day: 10,
    month: 'Lucidus',
    year: 1511
  }
} as const;

// 🌙 Your custom month names
const MONTH_NAMES = [
  'Primaris',
  'Gelidus',
  'Hibernis',
  'Vernalis',
  'Pluvoris',
  'Florara',
  'Solinus',
  'Aestara',
  'Lucidus',
  'Fructara',
  'Umbraeus',
  'Aridus',
] as const;

export const CampaignDateSchema = z.object({
  currentDate: z.object({
    day: z.number().int().min(1).max(31),
    month: z.enum(MONTH_NAMES),
    year: z.number().int()
  })
});

// ✅ Validate the date at startup
const result = CampaignDateSchema.safeParse(CURRENT_DATE);

if (!result.success) {
  console.error('❌ Invalid campaign date:', result.error.format());
  throw new Error('Invalid campaign date in campaign-date.ts');
}

export const campaignDate = result.data;
