import fs from 'fs/promises';
import { glob } from 'glob';
import { parse, stringify } from 'yaml';

// Mapping of flag field → tag name
const FLAG_TO_TAG = {
  hasCrystals: 'crystal-bounty',
  hasDungeon: 'dungeon',
  hasSettlement: 'settlement',
  isDragonRuins: 'dragon-ruins',
  isFcRuins: 'fc-ruins',
  isGoblinRuins: 'goblin-ruins',
  isHaven: 'haven',
  isScarSite: 'scar-site',
};

const HEX_DIR = '/Users/alexgs/projects/skyreach/data/hexes';

const files = await glob(`${HEX_DIR}/**/*.yaml`);

for (const file of files) {
  const raw = await fs.readFile(file, 'utf8');
  const data = parse(raw);

  const tags = new Set(data.tags || []);

  const flags = data.flags || {};
  for (const [flag, isSet] of Object.entries(flags)) {
    if (isSet && FLAG_TO_TAG[flag]) {
      tags.add(FLAG_TO_TAG[flag]);
    }
  }

  // Remove old flags field
  delete data.flags;

  // Set new tags array (sorted for consistency)
  if (tags.size > 0) {
    data.tags = Array.from(tags).sort();
  }

  // Write back the file
  const newYaml = stringify(data);
  await fs.writeFile(file, newYaml, 'utf8');
  console.log(`✅ Migrated ${file}`);
}

console.log(`🎉 Migration complete!`);
