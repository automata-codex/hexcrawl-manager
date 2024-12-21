import { writeFileSync } from "fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { HexDatabaseSchema } from "../schemas/hex-database.js";

const databaseFile = new URL("../schemas/hex-database.json", import.meta.url);
writeFileSync(
  databaseFile,
  JSON.stringify(zodToJsonSchema(HexDatabaseSchema), null, 2)
);
