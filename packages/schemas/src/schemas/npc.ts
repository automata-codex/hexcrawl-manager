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
  // Identity fields below are player-facing whenever the NPC is visible.
  // Like `description`, they record the NPC's outward presentation — covers
  // and personas played straight — never the concealed truth, which lives in
  // `gmNotes`. A disguised being's apparent species/culture/role goes here;
  // what they actually are goes in gmNotes.
  occupation: z
    .string()
    .describe(
      'Player-observable: the role this NPC presents. Covers played straight; the true role, if different, goes in gmNotes.',
    ),
  class: ClassEnum.optional().describe(
    'Player-observable presentation. A concealed or true class goes in gmNotes, not here.',
  ),
  adventuringCompany: z.string().optional(),
  species: z
    .string()
    .describe(
      'Player-observable: the species this NPC appears to be. A disguised being records its apparent species here; the true species goes in gmNotes.',
    ),
  culture: z
    .string()
    .describe(
      'Player-observable: the culture this NPC presents as belonging to. True origin, if different, goes in gmNotes.',
    ),
  pronouns: z.string(),
  // The description/gmNotes pair carries a fixed audience contract:
  // description is player-observable by construction; gmNotes is GM-only by
  // construction. This is the canonical statement of that contract.
  description: z
    .string()
    .describe(
      'Player-observable. Everything a player could learn by engaging with this NPC as they present themselves — including covers and personas, written straight. If a player could NOT learn it that way, it belongs in gmNotes. Apply the test per sentence. Shown to players when visibility is "player".',
    ),
  image: z.string().optional(),
  factions: z.array(z.string()).optional(), // Factions this NPC is associated with; see `FactionAgentSchema` in `./factions.ts` for listing NPCs on the faction page
  plotlines: z.array(z.string()).optional(),
  /**
   * @deprecated Use `gmNotes`. Retained so unmigrated files still validate
   * during the migration window; remove once no file uses it.
   */
  notes: z
    .array(z.string())
    .optional()
    .describe(
      'DEPRECATED — use gmNotes. Flat list of GM notes; superseded by the gmNotes markdown field. Kept optional during migration so unmigrated files validate.',
    ),
  gmNotes: z
    .string()
    .optional()
    .describe(
      'GM-only; never shown to players, regardless of visibility. Markdown. Holds the truth behind the description plus performance and run-the-NPC reference. Convention: prose sections for read-once material (e.g. "## Truth", "## Voice"), bulleted sections for table-scanning (e.g. "## Reference").',
    ),
  clues: ClueReferencesSchema.describe(
    'IDs of clues this NPC knows or can reveal',
  ),
  visibility: NpcVisibilityEnum.default('player').describe(
    'Gates the player-facing fields (description, occupation, species, etc.). "gm" = not yet introduced / hidden from players. gmNotes is GM-only regardless of this value, so flipping to "player" reveals the description but never the gmNotes.',
  ),
  campaignStatus: CampaignStatusEnum.default('active'),
});

export type NpcData = z.infer<typeof NpcSchema>;

export function getNpcSortKey(npc: NpcData): string {
  return npc.sortName ?? npc.displayName;
}

export function isPlayerVisible(npc: { visibility?: NpcVisibility }): boolean {
  return (npc.visibility ?? 'player') === 'player';
}
