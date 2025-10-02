import { PACES, PILLARS, TIERS } from './constants';

export type Pace = (typeof PACES)[number];

export type Pillar = (typeof PILLARS)[number];

export type Tier = (typeof TIERS)[number];

export type Event = {
  seq: number; // 1..N within the file
  ts: string; // ISO timestamp
  kind: string; // "move" | "scout" | ...
  payload: Record<string, unknown>;
};
