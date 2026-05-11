import { z } from 'zod';

import { CampaignStatusEnum } from './campaign-status.js';
import { ClassEnum } from './class-enum.js';
import { ClueReferencesSchema } from './clue-reference.js';

export const NpcVisibilityEnum = z.enum(['player', 'gm']);
export type NpcVisibility = z.infer<typeof NpcVisibilityEnum>;

export const NpcSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  sortName: z.string().optional(),
  occupation: z.string(),
  class: ClassEnum.optional(),
  adventuringCompany: z.string().optional(),
  species: z.string(),
  culture: z.string(),
  pronouns: z.string(),
  description: z.string(),
  image: z.string().optional(),
  factions: z.array(z.string()).optional(), // Factions this NPC is associated with; see `FactionAgentSchema` in `./factions.ts` for listing NPCs on the faction page
  plotlines: z.array(z.string()).optional(),
  notes: z.array(z.string()).optional(),
  clues: ClueReferencesSchema.describe(
    'IDs of clues this NPC knows or can reveal',
  ),
  visibility: NpcVisibilityEnum.default('player'),
  campaignStatus: CampaignStatusEnum.default('active'),
});

export type NpcData = z.infer<typeof NpcSchema>;

export function getNpcSortKey(npc: NpcData): string {
  return npc.sortName ?? npc.displayName;
}

export function isPlayerVisible(npc: { visibility?: NpcVisibility }): boolean {
  return (npc.visibility ?? 'player') === 'player';
}
