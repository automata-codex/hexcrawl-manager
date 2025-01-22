import { writeFileSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ClassSchema } from '../schemas/class.js';
import { FactionListSchema } from '../schemas/faction.js';
import { FloatingClueListSchema } from '../schemas/floating-clue-list.js';
import { HexListSchema } from '../schemas/hex-list.js';
import { NpcDataSchema } from '../schemas/npc.js';
import { RandomEncounterSchema } from '../schemas/random-encounter.js';
import { RegionSchema } from '../schemas/region.js';
import { RumorListSchema } from '../schemas/rumor.js';
import { StatBlockSchema } from '../schemas/stat-block.js';
import { SupplementListSchema } from '../schemas/supplement-list.js';

const classFile = new URL('../schemas/class.json', import.meta.url);
writeFileSync(
  classFile,
  JSON.stringify(zodToJsonSchema(ClassSchema), null, 2)
);

const factionFile = new URL('../schemas/faction.json', import.meta.url);
writeFileSync(
  factionFile,
  JSON.stringify(zodToJsonSchema(FactionListSchema), null, 2)
);

const floatingClueListFile = new URL('../schemas/floating-clue-list.json', import.meta.url);
writeFileSync(
  floatingClueListFile,
  JSON.stringify(zodToJsonSchema(FloatingClueListSchema), null, 2)
);

const hexListFile = new URL('../schemas/hex-list.json', import.meta.url);
writeFileSync(
  hexListFile,
  JSON.stringify(zodToJsonSchema(HexListSchema), null, 2)
);

const npcFile = new URL('../schemas/npc.json', import.meta.url);
writeFileSync(
  npcFile,
  JSON.stringify(zodToJsonSchema(NpcDataSchema), null, 2)
);

const randomEncounterFile = new URL('../schemas/random-encounter.json', import.meta.url);
writeFileSync(
  randomEncounterFile,
  JSON.stringify(zodToJsonSchema(RandomEncounterSchema), null, 2)
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
