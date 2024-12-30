import { writeFileSync } from 'fs';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { HexDatabaseSchema } from '../schemas/hex-database.js';
import { RandomEncounterSchema } from '../schemas/random-encounter.js';
import { RegionDatabaseSchema } from '../schemas/region.js';

const hexDatabaseFile = new URL('../schemas/hex-database.json', import.meta.url);
writeFileSync(
  hexDatabaseFile,
  JSON.stringify(zodToJsonSchema(HexDatabaseSchema), null, 2)
);

const randomEncounterFile = new URL('../schemas/random-encounter.json', import.meta.url);
writeFileSync(
  randomEncounterFile,
  JSON.stringify(zodToJsonSchema(RandomEncounterSchema), null, 2)
);

const regionDatabaseFile = new URL('../schemas/region.json', import.meta.url);
writeFileSync(
  regionDatabaseFile,
  JSON.stringify(zodToJsonSchema(RegionDatabaseSchema), null, 2)
);
