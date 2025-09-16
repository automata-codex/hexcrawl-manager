import { writeFileSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { BountyListSchema } from '../schemas/bounty.js';
import { CharacterSchema } from '../schemas/character.js';
import { ClassSchema } from '../schemas/class.js';
import { EncounterSchema } from '../schemas/encounter.js';
import { EncounterTableSchema } from '../schemas/encounter-table.js';
import { FactionListSchema } from '../schemas/faction.js';
import { FloatingClueSchema } from '../schemas/floating-clue.js';
import { HexSchema } from '../schemas/hex.js';
import { KnowledgeNodeSchema } from '../schemas/knowledge-node.js';
import { LootPackListSchema } from '../schemas/loot-pack.js';
import { MapPathSchema } from '../schemas/map-path.js';
import { NpcSchema } from '../schemas/npc.js';
import { PlayerListSchema } from '../schemas/player.js';
import { RegionSchema } from '../schemas/region.js';
import { RumorListSchema } from '../schemas/rumor.js';
import { SessionSchema } from '../schemas/session.js';
import { StatBlockSchema } from '../schemas/stat-block.js';
import { SupplementListSchema } from '../schemas/supplement-list.js';
import { TrailSchema } from '../schemas/trails.js';
import { TreasureSchema } from '../schemas/treasure.js';
import { UnusedHiddenSiteListSchema } from '../schemas/unused-hidden-site.js';
import { ZoneSchema } from '../schemas/zone.js';

const bountyFile = new URL('../schemas/bounty.json', import.meta.url);
writeFileSync(
  bountyFile,
  JSON.stringify(zodToJsonSchema(BountyListSchema), null, 2)
);

const characterFile = new URL('../schemas/character.json', import.meta.url);
writeFileSync(
  characterFile,
  JSON.stringify(zodToJsonSchema(CharacterSchema), null, 2)
);

const classFile = new URL('../schemas/class.json', import.meta.url);
writeFileSync(
  classFile,
  JSON.stringify(zodToJsonSchema(ClassSchema), null, 2)
);

const encounterEntryFile = new URL('../schemas/encounter.json', import.meta.url);
writeFileSync(
  encounterEntryFile,
  JSON.stringify(zodToJsonSchema(EncounterSchema), null, 2)
);

const encounterTableFile = new URL('../schemas/encounter-table.json', import.meta.url);
writeFileSync(
  encounterTableFile,
  JSON.stringify(zodToJsonSchema(EncounterTableSchema), null, 2)
);

const factionFile = new URL('../schemas/faction.json', import.meta.url);
writeFileSync(
  factionFile,
  JSON.stringify(zodToJsonSchema(FactionListSchema), null, 2)
);

const floatingClueFile = new URL('../schemas/floating-clue.json', import.meta.url);
writeFileSync(
  floatingClueFile,
  JSON.stringify(zodToJsonSchema(FloatingClueSchema), null, 2)
);

const hexFile = new URL('../schemas/hex.json', import.meta.url);
writeFileSync(
  hexFile,
  JSON.stringify(zodToJsonSchema(HexSchema), null, 2)
);

const knowledgeNodeFile = new URL('../schemas/knowledge-node.json', import.meta.url);
writeFileSync(
  knowledgeNodeFile,
  JSON.stringify(zodToJsonSchema(KnowledgeNodeSchema), null, 2)
);

const lootPackFile = new URL('../schemas/loot-pack.json', import.meta.url);
writeFileSync(
  lootPackFile,
  JSON.stringify(zodToJsonSchema(LootPackListSchema), null, 2)
);

const mapPath = new URL('../schemas/map-path.json', import.meta.url);
writeFileSync(
  mapPath,
  JSON.stringify(zodToJsonSchema(MapPathSchema), null, 2)
);

const npcFile = new URL('../schemas/npc.json', import.meta.url);
writeFileSync(
  npcFile,
  JSON.stringify(zodToJsonSchema(NpcSchema), null, 2)
);

const playerFile = new URL('../schemas/player.json', import.meta.url);
writeFileSync(
  playerFile,
  JSON.stringify(zodToJsonSchema(PlayerListSchema), null, 2)
);

const regionDatabaseFile = new URL('../schemas/region.json', import.meta.url);
writeFileSync(
  regionDatabaseFile,
  JSON.stringify(zodToJsonSchema(RegionSchema), null, 2)
);

const rumorFile = new URL('../schemas/rumor.json', import.meta.url);
writeFileSync(
  rumorFile,
  JSON.stringify(zodToJsonSchema(RumorListSchema), null, 2)
);

const sessionFile = new URL('../schemas/session.json', import.meta.url);
writeFileSync(
  sessionFile,
  JSON.stringify(zodToJsonSchema(SessionSchema), null, 2)
);

const statBlockFile = new URL('../schemas/stat-block.json', import.meta.url);
writeFileSync(
  statBlockFile,
  JSON.stringify(zodToJsonSchema(StatBlockSchema), null, 2)
);

const supplementFile = new URL('../schemas/supplement-list.json', import.meta.url);
writeFileSync(
  supplementFile,
  JSON.stringify(zodToJsonSchema(SupplementListSchema), null, 2)
);

const trailsFile = new URL('../schemas/trails.json', import.meta.url);
writeFileSync(
  trailsFile,
  JSON.stringify(zodToJsonSchema(TrailSchema), null, 2)
);

const treasureFile = new URL('../schemas/treasure.json', import.meta.url);
writeFileSync(
  treasureFile,
  JSON.stringify(zodToJsonSchema(TreasureSchema), null, 2)
);

const unusedHiddenSiteFile = new URL('../schemas/unused-hidden-site.json', import.meta.url);
writeFileSync(
  unusedHiddenSiteFile,
  JSON.stringify(zodToJsonSchema(UnusedHiddenSiteListSchema), null, 2)
);

const zoneFile = new URL('../schemas/zone.json', import.meta.url);
writeFileSync(
  zoneFile,
  JSON.stringify(zodToJsonSchema(ZoneSchema), null, 2)
);

