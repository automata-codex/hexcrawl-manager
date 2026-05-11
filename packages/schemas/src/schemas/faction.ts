import { z } from 'zod';

import { CampaignStatusEnum } from './campaign-status.js';

const FactionClockSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  totalSteps: z.number().int().positive(),
  completedSteps: z.number().int().nonnegative(),
});

const FactionAgentSchema = z.object({
  name: z.string(),
  role: z.string(),
  npcId: z.string().optional(), // Forward-compatible link to NPC data file
});

export const FactionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(), // GM-facing faction identity and notes (markdown)
  areaOfOperation: z.array(z.string()),
  powerLevel: z.string(),
  ideology: z.string(), // GM-facing prose summary of the faction's beliefs and motivations
  quote: z.string().optional(), // In-world voice quote for use at the table
  goals: z.string().optional(), // Long- and medium-term faction goals (markdown, supports nested lists)
  clocks: z.array(FactionClockSchema).optional(), // Progress clocks for trackable objectives
  ifIgnored: z.string().optional(), // What happens if the PCs don't engage with this faction
  pcIntersections: z.string().optional(), // How faction goals intersect with PC goals (markdown)
  activeAgents: z.array(FactionAgentSchema).optional(), // Named NPCs who embody the faction at the table
  campaignStatus: CampaignStatusEnum.default('active'),
});

export const FactionListSchema = z.array(FactionSchema);

export type FactionClockData = z.infer<typeof FactionClockSchema>;
export type FactionAgentData = z.infer<typeof FactionAgentSchema>;
export type FactionData = z.infer<typeof FactionSchema>;
